import { useCallback, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  Tag,
  Clock,
  Crown,
  PartyPopper,
  ChevronLeft,
} from "lucide-react-native";

import EmptyState from "@/components/EmptyState";
import SearchField from "@/components/SearchField";
import OfferSheet from "./OfferSheet";
import { API_URL } from "@/constants/api";
import { normalizeText } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./OffersScreen.styles";

// Everything a guest can get for free or cheaper tonight, in one place. The
// venues are already sorted promoted-first by the API.
export default function OffersScreen() {
  const navigation = useNavigation();

  const [offers, setOffers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/stores?offers=1`, {
        credentials: "include",
      });
      if (res.ok) setOffers(await res.json());
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Filtered here rather than server-side: this is one short list, and a round
  // trip per keystroke would be slower than the filtering itself.
  const needle = normalizeText(query.trim());
  const visible = needle
    ? offers.filter((store) =>
        normalizeText(
          [store.name, store.area, store.offer?.title].join(" "),
        ).includes(needle),
      )
    : offers;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable
            style={styles.back}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <ChevronLeft size={22} color={T.text} strokeWidth={2.2} />
          </Pressable>

          <Text style={styles.screenTitle}>Προσφορές</Text>

          {offers.length ? (
            <Text style={styles.count}>{offers.length} απόψε</Text>
          ) : null}
        </View>

        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Ψάξε προσφορά ή μαγαζί"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={T.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(store) => store._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={T.textMuted}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={PartyPopper}
              title={query ? "Κανένα αποτέλεσμα" : "Καμία προσφορά απόψε"}
              subtitle={
                query
                  ? undefined
                  : "Τα μαγαζιά ανεβάζουν προσφορές μέσα στη βραδιά. Ξαναδές αργότερα."
              }
            />
          }
          renderItem={({ item: store }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              onPress={() => setOpen(store)}
            >
              <Image
                source={{ uri: store.images?.[0] }}
                style={styles.image}
              />

              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Tag size={12} color={T.accent} strokeWidth={2.6} />
                  <Text style={styles.title} numberOfLines={1}>
                    {store.offer.title}
                  </Text>
                  {store.promoted ? (
                    <Crown size={12} color={T.warning} fill={T.warning} />
                  ) : null}
                </View>

                <Text style={styles.venue} numberOfLines={1}>
                  {store.name}
                  {store.area ? ` · ${store.area}` : ""}
                </Text>

                <View style={styles.metaRow}>
                  <Clock size={10} color={T.textFaint} strokeWidth={2.2} />
                  <Text style={styles.meta}>έως {store.offer.until}</Text>

                  {store.offer.left != null ? (
                    <Text style={styles.left}>
                      μένουν {store.offer.left}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      <OfferSheet
        storeId={open?._id}
        store={open}
        offer={open?.offer}
        onClose={() => setOpen(null)}
        onClaimed={({ offer }) =>
          setOffers((prev) =>
            offer
              ? prev.map((s) => (s._id === open._id ? { ...s, offer } : s))
              : prev.filter((s) => s._id !== open._id),
          )
        }
      />
    </SafeAreaView>
  );
}
