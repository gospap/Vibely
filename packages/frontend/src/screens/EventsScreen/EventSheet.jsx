import { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  X,
  Clock,
  Disc3,
  MapPin,
  Ticket,
  Users,
  Check,
} from "lucide-react-native";

import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import RatingStars from "@/components/RatingStars";
import { eventsService } from "@/services/events.service";
import { formatFullDate, formatPrice } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./EventSheet.styles";

// Bottom sheet for one event: full details, the host store with its rating, who
// is going, and the join button.
export default function EventSheet({ eventId, onClose, onAttendanceChange }) {
  const navigation = useNavigation();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    eventsService
      .get(eventId)
      .then((data) => !cancelled && setEvent(data))
      .catch((err) => !cancelled && Alert.alert("Σφάλμα", err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const toggleAttend = async () => {
    setBusy(true);
    try {
      const result = event.attending
        ? await eventsService.leave(event._id)
        : await eventsService.attend(event._id);

      setEvent((prev) => ({ ...prev, ...result }));
      onAttendanceChange?.(event._id, result);
    } catch (err) {
      Alert.alert("Δεν έγινε", err.message);
    } finally {
      setBusy(false);
    }
  };

  const openOnMap = () => {
    if (!event?.store?._id) return;
    onClose();
    // Jump to the map tab with this store already selected.
    navigation.navigate("Tabs", {
      screen: "Home",
      params: { focusStoreId: event.store._id },
    });
  };

  const capacityLeft =
    event?.capacity != null ? event.capacity - (event.attendantCount ?? 0) : null;

  return (
    <Modal
      visible={!!eventId}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />

        <View style={styles.sheet}>
          {loading || !event ? (
            <ActivityIndicator style={styles.loader} color={T.primary} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scroll}
            >
              <View>
                <Image
                  source={{ uri: event.images?.[0] }}
                  style={styles.hero}
                />
                <Pressable style={styles.close} onPress={onClose} hitSlop={8}>
                  <X size={18} color="#fff" strokeWidth={2.4} />
                </Pressable>
              </View>

              <View style={styles.body}>
                <Text style={styles.title}>{event.title}</Text>
                <Text style={styles.date}>
                  {formatFullDate(event.startDate)}
                </Text>

                <View style={styles.facts}>
                  <Fact
                    Icon={Clock}
                    label="Ώρες"
                    value={`${event.startHour ?? "—"} - ${event.endHour ?? "—"}`}
                  />
                  <Fact Icon={Disc3} label="Είδος" value={event.musicGenre} />
                  <Fact
                    Icon={Ticket}
                    label="Είσοδος"
                    value={formatPrice(event.ticketPrice)}
                  />
                </View>

                {event.lineup?.length ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Line-up</Text>
                    <View style={styles.lineup}>
                      {event.lineup.map((dj) => (
                        <View key={dj} style={styles.dj}>
                          <Disc3 size={13} color={T.accent} strokeWidth={2.2} />
                          <Text style={styles.djText}>{dj}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {event.description ? (
                  <Text style={styles.description}>{event.description}</Text>
                ) : null}

                {event.store ? (
                  <Pressable style={styles.store} onPress={openOnMap}>
                    <Image
                      source={{ uri: event.store.images?.[0] }}
                      style={styles.storeImage}
                    />

                    <View style={styles.storeText}>
                      <Text style={styles.storeName} numberOfLines={1}>
                        {event.store.name}
                      </Text>
                      <Text style={styles.storeArea} numberOfLines={1}>
                        {event.store.address || event.store.area}
                      </Text>
                      <RatingStars
                        value={event.store.ratings?.average ?? 0}
                        count={event.store.ratings?.count}
                        size={12}
                      />
                    </View>

                    <View style={styles.storeAction}>
                      <MapPin size={18} color={T.primary} strokeWidth={2.2} />
                      <Text style={styles.storeActionText}>Χάρτης</Text>
                    </View>
                  </Pressable>
                ) : null}

                <View style={styles.section}>
                  <View style={styles.attendHeader}>
                    <Users size={15} color={T.textMuted} strokeWidth={2.2} />
                    <Text style={styles.sectionTitle}>
                      {event.attendantCount} θα πάνε
                      {capacityLeft != null && capacityLeft <= 20
                        ? ` · ${Math.max(0, capacityLeft)} θέσεις`
                        : ""}
                    </Text>
                  </View>

                  {event.attendants?.length ? (
                    <View style={styles.avatars}>
                      {event.attendants.slice(0, 8).map((person) => (
                        <View key={person._id} style={styles.avatarWrap}>
                          <Avatar
                            uri={person.profileImageUrl}
                            name={person.username}
                            size={34}
                          />
                        </View>
                      ))}
                      {event.attendants.length > 8 ? (
                        <View style={[styles.avatarWrap, styles.avatarMore]}>
                          <Text style={styles.avatarMoreText}>
                            +{event.attendants.length - 8}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.noAttendants}>
                      Κανείς ακόμα. Γίνε ο πρώτος.
                    </Text>
                  )}
                </View>

                <Button
                  label={event.attending ? "Θα πάω" : "Δηλώνω συμμετοχή"}
                  icon={event.attending ? Check : undefined}
                  variant={event.attending ? "secondary" : "primary"}
                  loading={busy}
                  onPress={toggleAttend}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Fact({ Icon, label, value }) {
  return (
    <View style={styles.fact}>
      <Icon size={15} color={T.textMuted} strokeWidth={2} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1}>
        {value ?? "—"}
      </Text>
    </View>
  );
}
