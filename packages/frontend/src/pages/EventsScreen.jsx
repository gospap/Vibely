import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { CalendarX, Users, Tag } from "lucide-react-native";

import SearchField from "@/components/SearchField";
import Chip from "@/components/Chip";
import EmptyState from "@/components/EmptyState";
import EventSheet from "./EventSheet";
import OfferSheet from "./OfferSheet";
import { API_URL } from "@/constants/api";
import { toQuery } from "@/utils/query";
import { formatEventDate, formatPrice } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./EventsScreen.styles";

const PAGE_SIZE = 10;

export default function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const [genres, setGenres] = useState([]);
  const [genre, setGenre] = useState("all");
  const [tonight, setTonight] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [offers, setOffers] = useState([]);
  const [offerStore, setOfferStore] = useState(null);

  // Guards against a stale response from an older filter overwriting the list.
  const requestId = useRef(0);

  useEffect(() => {
    fetch(`${API_URL}/events/genres`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setGenres)
      .catch(() => setGenres([]));
  }, []);

  // Tonight's offers. Loaded once on mount rather than with the feed — they
  // are about right now, not about whatever the filters happen to say.
  useEffect(() => {
    fetch(`${API_URL}/stores?offers=1`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setOffers)
      .catch(() => setOffers([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchPage = useCallback(
    async (pageNumber) => {
      const id = ++requestId.current;

      const params = toQuery({
        page: pageNumber,
        limit: PAGE_SIZE,
        genre: genre === "all" ? undefined : genre,
        q: debouncedQuery || undefined,
        // The server decides what "tonight" means — before 06:00 it is still
        // last evening's night, and the client should not have to know that.
        tonight: tonight ? 1 : undefined,
      });

      const res = await fetch(`${API_URL}/events${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Σφάλμα ${res.status}`);

      const data = await res.json();
      return { data, fresh: id === requestId.current };
    },
    [genre, debouncedQuery, tonight],
  );

  const loadFirstPage = useCallback(async () => {
    try {
      const { data, fresh } = await fetchPage(1);
      if (!fresh) return;

      setEvents(data.items);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setPage(1);
      setError(null);
    } catch (err) {
      setError(err.message);
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    setLoading(true);
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || loading) return;

    setLoadingMore(true);
    try {
      const next = page + 1;
      const { data, fresh } = await fetchPage(next);
      if (!fresh) return;

      // Paging while the clock moves can repeat an event across page borders.
      setEvents((prev) => {
        const known = new Set(prev.map((e) => e._id));
        return [...prev, ...data.items.filter((e) => !known.has(e._id))];
      });
      setHasMore(data.hasMore);
      setPage(next);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Keeps the card badge in step after joining from inside the sheet.
  const onAttendanceChange = (eventId, { attending, attendantCount }) =>
    setEvents((prev) =>
      prev.map((e) =>
        e._id === eventId ? { ...e, attending, attendantCount } : e,
      ),
    );

  const renderItem = ({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => setSelectedId(item._id)}
    >
      <View>
        <Image source={{ uri: item.images?.[0] }} style={styles.image} />

        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>
            {formatEventDate(item.startDate)}
          </Text>
        </View>

        {item.attending ? (
          <View style={styles.goingBadge}>
            <Text style={styles.goingBadgeText}>Θα πάω</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.store} numberOfLines={1}>
          {item.store?.name}
          {item.store?.area ? ` · ${item.store.area}` : ""}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.genre} numberOfLines={1}>
            {item.musicGenre}
          </Text>

          <View style={styles.attendants}>
            <Users size={11} color={T.textFaint} strokeWidth={2.2} />
            <Text style={styles.attendantsText}>{item.attendantCount ?? 0}</Text>
          </View>
        </View>

        <Text style={styles.price}>
          {item.startHour} · {formatPrice(item.ticketPrice)}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.screenTitle}>Events</Text>
          {total > 0 ? (
            <Text style={styles.count}>{total} επερχόμενα</Text>
          ) : null}
        </View>

        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Ψάξε event, dj ή μαγαζί"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsRow}
      >
        <Chip
          label="Απόψε"
          active={tonight}
          onPress={() => setTonight((on) => !on)}
        />
        <Chip
          label="Όλα"
          active={genre === "all"}
          onPress={() => setGenre("all")}
        />
        {genres.map((g) => (
          <Chip
            key={g}
            label={g}
            active={genre === g}
            onPress={() => setGenre(g)}
          />
        ))}
      </ScrollView>

      {/* Tonight's offers ride above the feed — they expire in hours, the
          events do not. */}
      {offers.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.offers}
          style={styles.offersRow}
        >
          {offers.map((store) => (
            <Pressable
              key={store._id}
              style={styles.offerCard}
              onPress={() => setOfferStore(store)}
            >
              <View style={styles.offerTag}>
                <Tag size={11} color={T.accent} strokeWidth={2.6} />
                <Text style={styles.offerTagText}>Απόψε</Text>
              </View>

              <Text style={styles.offerTitle} numberOfLines={2}>
                {store.offer.title}
              </Text>

              <Text style={styles.offerVenue} numberOfLines={1}>
                {store.name}
              </Text>

              <Text style={styles.offerMeta}>
                Έως {store.offer.until}
                {store.offer.left != null ? ` · ${store.offer.left} ακόμα` : ""}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={T.primary} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFirstPage();
              }}
              tintColor={T.textMuted}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footerLoader} color={T.textFaint} />
            ) : events.length && !hasMore ? (
              <Text style={styles.endOfList}>Τέλος λίστας</Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={CalendarX}
              title="Κανένα event"
              subtitle={
                debouncedQuery || genre !== "all"
                  ? "Δοκίμασε άλλο φίλτρο ή αναζήτηση."
                  : "Δεν υπάρχουν προγραμματισμένα events αυτή τη στιγμή."
              }
            />
          }
        />
      )}

      <EventSheet
        eventId={selectedId}
        onClose={() => setSelectedId(null)}
        onAttendanceChange={onAttendanceChange}
      />

      <OfferSheet
        storeId={offerStore?._id}
        store={offerStore}
        offer={offerStore?.offer}
        onClose={() => setOfferStore(null)}
        // A claimed-out offer drops off the strip, same as it does server-side.
        onClaimed={({ offer }) =>
          setOffers((prev) =>
            offer
              ? prev.map((s) =>
                  s._id === offerStore._id ? { ...s, offer } : s,
                )
              : prev.filter((s) => s._id !== offerStore._id),
          )
        }
      />
    </SafeAreaView>
  );
}
