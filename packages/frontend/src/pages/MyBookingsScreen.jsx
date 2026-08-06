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
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import ChevronLeft from "lucide-react-native/dist/esm/icons/chevron-left";
import CalendarCheck from "lucide-react-native/dist/esm/icons/calendar-check";
import Users from "lucide-react-native/dist/esm/icons/users";
import Clock from "lucide-react-native/dist/esm/icons/clock";

import EmptyState from "@/components/EmptyState";
import { API_URL } from "@/constants/api";
import { formatNightKey } from "@/utils/format";
import { useStyles, useTheme } from "@/styles/theme";
import styleSheet from "./MyBookingsScreen.styles";

const call = async (path, { method = "GET" } = {}) => {
  const res = await fetch(`${API_URL}${path}`, { method, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Σφάλμα ${res.status}`);
  return data;
};

// Every status the guest can see, with the colour that carries the meaning.
const STATUS = (T) => ({
  pending: { label: "Σε αναμονή", color: T.warning },
  confirmed: { label: "Επιβεβαιωμένη", color: T.accent },
  declined: { label: "Απορρίφθηκε", color: T.danger },
  cancelled: { label: "Ακυρώθηκε", color: T.textFaint },
  seated: { label: "Ήσουν εκεί", color: T.textMuted },
  no_show: { label: "Δεν εμφανίστηκες", color: T.danger },
});

const CANCELLABLE = ["pending", "confirmed"];

export default function MyBookingsScreen() {
  const T = useTheme();
  const styles = useStyles(styleSheet);

  const navigation = useNavigation();

  const [scope, setScope] = useState("upcoming");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (which) => {
    try {
      setItems(await call(`/reservations/me?scope=${which}`));
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(scope);
    }, [load, scope]),
  );

  const cancel = (reservation) =>
    Alert.alert(
      "Ακύρωση κράτησης",
      `Σίγουρα θέλεις να ακυρώσεις το τραπέζι στο ${reservation.store?.name};`,
      [
        { text: "Όχι", style: "cancel" },
        {
          text: "Ακύρωση",
          style: "destructive",
          onPress: async () => {
            // Swapped in place rather than refetching — the row only changes
            // status and the list should not jump under the thumb.
            try {
              const updated = await call(`/reservations/${reservation._id}`, {
                method: "DELETE",
              });
              setItems((prev) =>
                prev.map((item) =>
                  item._id === updated._id ? { ...item, ...updated } : item,
                ),
              );
            } catch (err) {
              Alert.alert("Δεν ακυρώθηκε", err.message);
            }
          },
        },
      ],
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <ChevronLeft size={22} color={T.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Οι κρατήσεις μου</Text>
      </View>

      <View style={styles.segments}>
        {[
          { key: "upcoming", label: "Επερχόμενες" },
          { key: "past", label: "Ιστορικό" },
        ].map(({ key, label }) => {
          const active = scope === key;
          return (
            <Pressable
              key={key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => {
                setScope(key);
                setLoading(true);
              }}
            >
              <Text
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={T.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(scope);
              }}
              tintColor={T.textMuted}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={CalendarCheck}
              title={
                scope === "upcoming"
                  ? "Καμία κράτηση"
                  : "Κανένα ιστορικό ακόμα"
              }
              subtitle={
                scope === "upcoming"
                  ? "Βρες ένα μαγαζί στον χάρτη και κλείσε τραπέζι."
                  : "Οι περασμένες κρατήσεις σου θα φαίνονται εδώ."
              }
            />
          }
          renderItem={({ item }) => (
            <BookingRow
              reservation={item}
              onCancel={
                scope === "upcoming" && CANCELLABLE.includes(item.status)
                  ? () => cancel(item)
                  : null
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function BookingRow({ reservation, onCancel }) {
  const T = useTheme();
  const styles = useStyles(styleSheet);
  const status = STATUS(T)[reservation.status] ?? STATUS(T).pending;

  return (
    <View style={styles.row}>
      <Image
        source={{ uri: reservation.store?.images?.[0] }}
        style={styles.image}
      />

      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          <Text style={styles.storeName} numberOfLines={1}>
            {reservation.store?.name ?? "Μαγαζί"}
          </Text>

          <View
            style={[styles.pill, { backgroundColor: `${status.color}22` }]}
          >
            <Text style={[styles.pillText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.facts}>
          <Text style={styles.fact}>{formatNightKey(reservation.dateKey)}</Text>
          {reservation.arrivalTime ? (
            <View style={styles.factRow}>
              <Clock size={11} color={T.textFaint} strokeWidth={2.2} />
              <Text style={styles.fact}>{reservation.arrivalTime}</Text>
            </View>
          ) : null}
          <View style={styles.factRow}>
            <Users size={11} color={T.textFaint} strokeWidth={2.2} />
            <Text style={styles.fact}>{reservation.partySize}</Text>
          </View>
        </View>

        {reservation.event?.title ? (
          <Text style={styles.event} numberOfLines={1}>
            {reservation.event.title}
          </Text>
        ) : null}

        {reservation.tableLabel ? (
          <Text style={styles.table}>Τραπέζι {reservation.tableLabel}</Text>
        ) : null}

        {reservation.responseNote ? (
          <Text style={styles.responseNote} numberOfLines={2}>
            «{reservation.responseNote}»
          </Text>
        ) : null}

        {onCancel ? (
          <Pressable onPress={onCancel} hitSlop={6}>
            <Text style={styles.cancel}>Ακύρωση</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
