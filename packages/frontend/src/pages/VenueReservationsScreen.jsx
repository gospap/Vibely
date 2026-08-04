import { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Users,
  Clock,
  Check,
  X,
  CalendarCheck,
  Store as StoreIcon,
} from "lucide-react-native";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import VenueBookingSheet from "./VenueBookingSheet";
import { API_URL } from "@/constants/api";
import { formatNightKey } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./VenueReservationsScreen.styles";

const call = async (path, { method = "GET", body } = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Σφάλμα ${res.status}`);
  return data;
};

const SCOPES = [
  { key: "pending", label: "Σε αναμονή" },
  { key: "upcoming", label: "Επερχόμενες" },
  { key: "past", label: "Ιστορικό" },
];

const STATUS = {
  pending: { label: "Σε αναμονή", color: T.warning },
  confirmed: { label: "Επιβεβαιωμένη", color: T.primary },
  declined: { label: "Απορρίφθηκε", color: T.danger },
  cancelled: { label: "Ακυρώθηκε", color: T.textFaint },
  seated: { label: "Ήρθαν", color: T.accent },
  no_show: { label: "Δεν ήρθαν", color: T.danger },
};

// The booking book. VenueScreen answers "who is coming tonight"; this answers
// "what still needs me", across every night at once.
export default function VenueReservationsScreen() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);

  const [scope, setScope] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState(null);

  useEffect(() => {
    call("/stores/mine")
      .then((mine) => {
        setStores(mine);
        setStoreId((prev) => prev ?? mine[0]?._id ?? null);
        if (!mine.length) setLoading(false);
      })
      .catch((err) => {
        console.log(err.message);
        setLoading(false);
      });
  }, []);

  const load = useCallback(async () => {
    if (!storeId) return;

    try {
      const data = await call(
        `/reservations/store/${storeId}/list?scope=${scope}`,
      );
      setItems(data.items);
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storeId, scope]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Answered rows leave the pending list, so drop them rather than restyling
  // in place — the queue should shorten as it is worked through.
  const settle = (updated) =>
    setItems((prev) =>
      scope === "pending"
        ? prev.filter((item) => item._id !== updated._id)
        : prev.map((item) =>
            item._id === updated._id ? { ...item, ...updated } : item,
          ),
    );

  const respond = async (reservation, status) => {
    try {
      settle(
        await call(`/reservations/${reservation._id}`, {
          method: "PATCH",
          body: { status },
        }),
      );
    } catch (err) {
      Alert.alert("Δεν έγινε", err.message);
    }
  };

  if (!loading && !stores.length) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon={StoreIcon}
          title="Κανένα μαγαζί"
          subtitle="Ο λογαριασμός σου δεν είναι συνδεδεμένος με κάποιο μαγαζί ακόμα."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Κρατήσεις</Text>

      {stores.length > 1 ? (
        <FlatList
          horizontal
          data={stores}
          keyExtractor={(s) => s._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsRow}
          renderItem={({ item }) => {
            const active = item._id === storeId;
            return (
              <Pressable
                onPress={() => {
                  setStoreId(item._id);
                  setLoading(true);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : null}

      <View style={styles.segments}>
        {SCOPES.map(({ key, label }) => {
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
                load();
              }}
              tintColor={T.textMuted}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={CalendarCheck}
              title={
                scope === "pending"
                  ? "Τίποτα σε αναμονή"
                  : scope === "upcoming"
                    ? "Καμία επερχόμενη κράτηση"
                    : "Κανένα ιστορικό"
              }
              subtitle={
                scope === "pending"
                  ? "Όλα τα αιτήματα έχουν απαντηθεί."
                  : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <Row
              reservation={item}
              onOpen={() => setResponding(item)}
              onRespond={
                item.status === "pending"
                  ? (status) => respond(item, status)
                  : null
              }
            />
          )}
        />
      )}

      <VenueBookingSheet
        reservation={responding}
        onClose={() => setResponding(null)}
        onUpdated={(updated) => {
          settle(updated);
          setResponding(null);
        }}
      />
    </SafeAreaView>
  );
}

function Row({ reservation, onOpen, onRespond }) {
  const status = STATUS[reservation.status] ?? STATUS.pending;

  return (
    <Pressable style={styles.row} onPress={onOpen}>
      <View style={styles.rowHead}>
        <Avatar
          uri={reservation.user?.profileImageUrl}
          name={reservation.user?.username}
          size={38}
        />

        <View style={styles.rowText}>
          <Text style={styles.guest} numberOfLines={1}>
            {reservation.contactName ||
              reservation.user?.username ||
              "Χρήστης"}
          </Text>

          <View style={styles.facts}>
            <Text style={styles.night}>
              {formatNightKey(reservation.dateKey)}
            </Text>
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
        </View>

        <View style={[styles.pill, { backgroundColor: `${status.color}22` }]}>
          <Text style={[styles.pillText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {reservation.note ? (
        <Text style={styles.note} numberOfLines={2}>
          «{reservation.note}»
        </Text>
      ) : null}

      {onRespond ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.action, styles.decline]}
            onPress={() => onRespond("declined")}
          >
            <X size={15} color={T.danger} strokeWidth={2.4} />
            <Text style={[styles.actionText, { color: T.danger }]}>
              Απόρριψη
            </Text>
          </Pressable>

          <Pressable
            style={[styles.action, styles.accept]}
            onPress={() => onRespond("confirmed")}
          >
            <Check size={15} color="#fff" strokeWidth={2.4} />
            <Text style={[styles.actionText, { color: "#fff" }]}>Αποδοχή</Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}
