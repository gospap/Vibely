import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  X,
  Navigation2,
  Bookmark,
  Clock,
  Phone,
  Star,
} from "lucide-react-native";

import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import RatingStars from "@/components/RatingStars";
import PhotoCarousel from "@/components/PhotoCarousel";
import { API_URL } from "@/constants/api";
import {
  formatEventDate,
  formatTimeAgo,
  isOpenNow,
  priceLevel,
  todayHours,
  formatDistance,
} from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./StoreSheet.styles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORY_LABELS = {
  bar: "Bar",
  club: "Club",
  live: "Live",
  rooftop: "Rooftop",
  cafe: "Café",
  beach: "Beach bar",
};

// Everything about one venue: photos, rating breakdown, reviews, tonight's
// events and the button that hands the destination back to the map.
export default function StoreSheet({ storeId, distanceKm, onClose, onNavigate }) {
  const [store, setStore] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setStore(null);
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async (path) => {
      const res = await fetch(`${API_URL}${path}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Σφάλμα ${res.status}`);
      return res.json();
    };

    Promise.all([
      load(`/stores/${storeId}`),
      load(`/stores/${storeId}/events`),
    ])
      .then(([detail, upcoming]) => {
        if (cancelled) return;
        setStore(detail);
        setEvents(upcoming);
        setSaved(!!detail.saved);
        setDraftRating(detail.myReview?.rating ?? 0);
        setDraftComment(detail.myReview?.comment ?? "");
      })
      .catch((err) => !cancelled && Alert.alert("Σφάλμα", err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  const submitReview = async () => {
    if (!draftRating) return;

    setSavingReview(true);
    try {
      const res = await fetch(`${API_URL}/stores/${storeId}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: draftRating,
          comment: draftComment.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Σφάλμα ${res.status}`);

      const { review, ratings } = await res.json();

      // Swap my review into the visible list rather than refetching the sheet.
      setStore((prev) => ({
        ...prev,
        ratings,
        myReview: review,
        reviews: [
          review,
          ...(prev.reviews || []).filter((r) => r._id !== review._id),
        ],
      }));
    } catch (err) {
      Alert.alert("Δεν αποθηκεύτηκε", err.message);
    } finally {
      setSavingReview(false);
    }
  };

  const toggleSave = async () => {
    setSaved((prev) => !prev);
    try {
      const res = await fetch(`${API_URL}/stores/${storeId}/save`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Σφάλμα ${res.status}`);

      const { saved: next } = await res.json();
      setSaved(next);
    } catch {
      setSaved((prev) => !prev);
    }
  };

  const open = store ? isOpenNow(store.openingHours) : null;
  const hours = store ? todayHours(store.openingHours) : null;
  const total = store?.ratings?.count ?? 0;

  return (
    <Modal
      visible={!!storeId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />

        <View style={styles.sheet}>
          {loading || !store ? (
            <ActivityIndicator style={styles.loader} color={T.primary} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              <View>
                <PhotoCarousel
                  images={store.images}
                  width={SCREEN_WIDTH}
                  height={215}
                />

                <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
                  <X size={18} color="#fff" strokeWidth={2.4} />
                </Pressable>

                <Pressable style={styles.save} onPress={toggleSave} hitSlop={8}>
                  <Bookmark
                    size={18}
                    color="#fff"
                    fill={saved ? "#fff" : "transparent"}
                    strokeWidth={2.2}
                  />
                </Pressable>
              </View>

              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{store.name}</Text>
                  {open != null ? (
                    <View
                      style={[styles.openTag, !open && styles.openTagClosed]}
                    >
                      <Text
                        style={[
                          styles.openTagText,
                          !open && styles.openTagTextClosed,
                        ]}
                      >
                        {open ? "Ανοιχτά" : "Κλειστά"}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.meta}>
                  {CATEGORY_LABELS[store.category] ?? store.category}
                  {store.area ? ` · ${store.area}` : ""}
                  {` · ${priceLevel(store.priceLevel)}`}
                  {distanceKm != null ? ` · ${formatDistance(distanceKm)}` : ""}
                </Text>

                {store.address ? (
                  <Text style={styles.address}>{store.address}</Text>
                ) : null}

                {hours ? (
                  <View style={styles.hoursRow}>
                    <Clock size={13} color={T.textFaint} strokeWidth={2} />
                    <Text style={styles.hours}>Σήμερα {hours}</Text>
                  </View>
                ) : null}

                {store.phone ? (
                  <View style={styles.hoursRow}>
                    <Phone size={13} color={T.textFaint} strokeWidth={2} />
                    <Text style={styles.hours}>{store.phone}</Text>
                  </View>
                ) : null}

                {store.description ? (
                  <Text style={styles.description}>{store.description}</Text>
                ) : null}

                {store.tags?.length ? (
                  <View style={styles.tags}>
                    {store.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Button
                  label="Πλοήγηση"
                  icon={Navigation2}
                  onPress={() => onNavigate(store)}
                />

                {/* ---- rating summary ---- */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Βαθμολογία</Text>

                  <View style={styles.ratingSummary}>
                    <View style={styles.ratingBig}>
                      <Text style={styles.ratingValue}>
                        {store.ratings?.average
                          ? store.ratings.average.toFixed(1)
                          : "—"}
                      </Text>
                      <RatingStars
                        value={store.ratings?.average ?? 0}
                        size={12}
                        showValue={false}
                      />
                      <Text style={styles.ratingCount}>
                        {total} κριτικές
                      </Text>
                    </View>

                    <View style={styles.histogram}>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = store.histogram?.[star] ?? 0;
                        const pct = total ? (count / total) * 100 : 0;

                        return (
                          <View key={star} style={styles.histogramRow}>
                            <Text style={styles.histogramStar}>{star}</Text>
                            <Star
                              size={9}
                              color={T.textFaint}
                              fill={T.textFaint}
                            />
                            <View style={styles.histogramTrack}>
                              <View
                                style={[styles.histogramFill, { width: `${pct}%` }]}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* ---- write a review ---- */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {store.myReview ? "Η κριτική σου" : "Γράψε κριτική"}
                  </Text>

                  <View style={styles.reviewForm}>
                    <RatingStars value={draftRating} onChange={setDraftRating} />

                    <TextInput
                      value={draftComment}
                      onChangeText={setDraftComment}
                      placeholder="Πες μας πώς ήταν (προαιρετικό)"
                      placeholderTextColor={T.textFaint}
                      style={styles.reviewInput}
                      multiline
                      maxLength={500}
                    />

                    <Button
                      label={store.myReview ? "Ενημέρωση" : "Υποβολή"}
                      variant="secondary"
                      disabled={!draftRating}
                      loading={savingReview}
                      onPress={submitReview}
                    />
                  </View>
                </View>

                {/* ---- reviews ---- */}
                {store.reviews?.length ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Τι λένε οι άλλοι</Text>

                    {store.reviews.map((review) => (
                      <View key={review._id} style={styles.review}>
                        <Avatar
                          uri={review.author?.profileImageUrl}
                          name={review.author?.username}
                          size={34}
                        />

                        <View style={styles.reviewBody}>
                          <View style={styles.reviewHead}>
                            <Text style={styles.reviewAuthor}>
                              {review.author?.username ?? "Χρήστης"}
                            </Text>
                            <Text style={styles.reviewTime}>
                              {formatTimeAgo(review.createdAt)}
                            </Text>
                          </View>

                          <RatingStars
                            value={review.rating}
                            size={11}
                            showValue={false}
                          />

                          {review.comment ? (
                            <Text style={styles.reviewText}>{review.comment}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* ---- what's on ---- */}
                {events.length ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Επερχόμενα events</Text>

                    {events.map((event) => (
                      <View key={event._id} style={styles.event}>
                        <Image
                          source={{ uri: event.images?.[0] }}
                          style={styles.eventImage}
                        />
                        <View style={styles.eventText}>
                          <Text style={styles.eventTitle} numberOfLines={1}>
                            {event.title}
                          </Text>
                          <Text style={styles.eventMeta}>
                            {formatEventDate(event.startDate)} · {event.startHour}
                          </Text>
                          <Text style={styles.eventGenre} numberOfLines={1}>
                            {event.musicGenre}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
