import { useCallback, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Check,
  X,
  Store as StoreIcon,
  Radio,
  KeyRound,
  ChartNoAxesColumn,
} from "lucide-react-native";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import VenueBookingSheet from "./VenueBookingSheet";
import { API_URL } from "@/constants/api";
import { currentNightKey, formatNightKey, toDateKey } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./VenueScreen.styles";

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

// What the venue tells the city about right now.
const CROWD = [
  { key: "quiet", label: "Ήσυχα", color: T.textMuted },
  { key: "filling", label: "Γεμίζει", color: T.accent },
  { key: "busy", label: "Γεμάτο", color: T.warning },
  { key: "packed", label: "Ουρά", color: T.danger },
];

// Move a day without a date picker: nights are always near.
const shiftKey = (key, days) => {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

// The venue's night: pending requests to answer, confirmed tables to seat, and
// the two switches (live status, check-in code) that only matter tonight.
export default function VenueScreen() {
  const navigation = useNavigation();

  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);

  const [dateKey, setDateKey] = useState(currentNightKey());
  const [sheet, setSheet] = useState(null);
  const [code, setCode] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState(null);

  useEffect(() => {
    call("/stores/mine")
      .then((mine) => {
        setStores(mine);
        setStoreId((prev) => prev ?? mine[0]?._id ?? null);
      })
      .catch((err) => console.log(err.message))
      .finally(() => setLoading(false));
  }, []);

  const load = useCallback(async () => {
    if (!storeId) return;

    try {
      const [night, doorCode] = await Promise.all([
        call(`/reservations/store/${storeId}?dateKey=${dateKey}`),
        call(`/stores/${storeId}/check-in-code`),
      ]);
      setSheet(night);
      setCode(doorCode);
    } catch (err) {
      console.log(err.message);
    } finally {
      setRefreshing(false);
    }
  }, [storeId, dateKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const store = stores.find((s) => s._id === storeId);
  const isTonight = dateKey === currentNightKey();

  const setLive = async (crowd) => {
    // Tapping the active level again turns reporting off, which is how a venue
    // closing early drops off the Tonight list.
    const next = store?.live?.crowd === crowd ? null : crowd;

    try {
      const { live } = await call(`/stores/${storeId}/live`, {
        method: "PUT",
        body: { crowd: next },
      });
      setStores((prev) =>
        prev.map((s) => (s._id === storeId ? { ...s, live } : s)),
      );
    } catch (err) {
      Alert.alert("Δεν αποθηκεύτηκε", err.message);
    }
  };

  // Swap the answered row in place — the sheet should not jump while the door
  // staff are working down it.
  const applyUpdate = (updated) =>
    setSheet((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) =>
              item._id === updated._id ? { ...item, ...updated } : item,
            ),
          }
        : prev,
    );

  const respond = async (reservation, status) => {
    try {
      applyUpdate(
        await call(`/reservations/${reservation._id}`, {
          method: "PATCH",
          body: { status },
        }),
      );
      // Covers changed, so the bar at the top is now stale.
      load();
    } catch (err) {
      Alert.alert("Δεν έγινε", err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={T.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!stores.length) {
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

  const pending = (sheet?.items ?? []).filter((i) => i.status === "pending");
  const confirmed = (sheet?.items ?? []).filter((i) =>
    ["confirmed", "seated", "no_show"].includes(i.status),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
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
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>{store?.name}</Text>

          <Pressable
            style={styles.analytics}
            onPress={() => navigation.navigate("VenueAnalytics")}
            hitSlop={8}
          >
            <ChartNoAxesColumn size={18} color={T.primary} strokeWidth={2.3} />
          </Pressable>
        </View>

        {stores.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {stores.map((s) => {
              const active = s._id === storeId;
              return (
                <Pressable
                  key={s._id}
                  onPress={() => setStoreId(s._id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* ---- live status: always about tonight ---- */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Radio size={15} color={T.primary} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Απόψε στον χάρτη</Text>
          </View>

          <View style={styles.crowdRow}>
            {CROWD.map(({ key, label, color }) => {
              const active = store?.live?.crowd === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setLive(key)}
                  style={[
                    styles.crowd,
                    active && { backgroundColor: `${color}26`, borderColor: color },
                  ]}
                >
                  <Text style={[styles.crowdText, active && { color }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.cardHint}>
            {store?.live?.crowd
              ? "Οι χρήστες το βλέπουν στον χάρτη. Πάτα ξανά για να το σβήσεις."
              : "Διάλεξε κατάσταση για να εμφανιστείς στο «Απόψε»."}
          </Text>
        </View>

        {/* ---- door code ---- */}
        {code?.enabled ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <KeyRound size={15} color={T.accent} strokeWidth={2.2} />
              <Text style={styles.cardTitle}>Κωδικός βραδιάς</Text>
            </View>

            <View style={styles.codeRow}>
              <Text style={styles.code}>{code.code}</Text>
              <View style={styles.codeMeta}>
                <Text style={styles.codeCount}>{code.checkedIn}</Text>
                <Text style={styles.codeLabel}>check-in απόψε</Text>
              </View>
            </View>

            <Text style={styles.cardHint}>
              Δείξε τον στα τραπέζια. Αλλάζει μόνος του κάθε βράδυ.
            </Text>
          </View>
        ) : null}

        {/* ---- night switcher ---- */}
        <View style={styles.nightBar}>
          <Pressable
            onPress={() => setDateKey((k) => shiftKey(k, -1))}
            hitSlop={8}
            style={styles.nightArrow}
          >
            <ChevronLeft size={20} color={T.text} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.nightLabel}>
            <Text style={styles.nightText}>{formatNightKey(dateKey)}</Text>
            {!isTonight ? (
              <Pressable onPress={() => setDateKey(currentNightKey())}>
                <Text style={styles.nightToday}>Πήγαινε στο απόψε</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setDateKey((k) => shiftKey(k, 1))}
            hitSlop={8}
            style={styles.nightArrow}
          >
            <ChevronRight size={20} color={T.text} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* ---- covers ---- */}
        <View style={styles.covers}>
          <View style={styles.coversHead}>
            <Users size={15} color={T.textMuted} strokeWidth={2.2} />
            <Text style={styles.coversText}>
              {sheet?.covers?.confirmed ?? 0}
              {sheet?.capacityPerNight ? ` / ${sheet.capacityPerNight}` : ""} άτομα
            </Text>
            {sheet?.covers?.pending ? (
              <Text style={styles.coversPending}>
                {sheet.covers.pending} σε αναμονή
              </Text>
            ) : null}
          </View>

          {sheet?.capacityPerNight ? (
            <View style={styles.coversTrack}>
              <View
                style={[
                  styles.coversFill,
                  {
                    width: `${Math.min(
                      100,
                      ((sheet.covers?.confirmed ?? 0) / sheet.capacityPerNight) * 100,
                    )}%`,
                  },
                ]}
              />
            </View>
          ) : null}
        </View>

        {/* ---- pending ---- */}
        {pending.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Σε αναμονή</Text>

            {pending.map((item) => (
              <View key={item._id} style={styles.request}>
                <RequestHead reservation={item} />

                {item.note ? (
                  <Text style={styles.note}>«{item.note}»</Text>
                ) : null}

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.action, styles.decline]}
                    onPress={() => respond(item, "declined")}
                  >
                    <X size={15} color={T.danger} strokeWidth={2.4} />
                    <Text style={[styles.actionText, { color: T.danger }]}>
                      Απόρριψη
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.action, styles.accept]}
                    onPress={() => setResponding(item)}
                  >
                    <Check size={15} color="#fff" strokeWidth={2.4} />
                    <Text style={[styles.actionText, { color: "#fff" }]}>
                      Αποδοχή
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ---- confirmed ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Επιβεβαιωμένες ({confirmed.length})
          </Text>

          {confirmed.length ? (
            confirmed.map((item) => (
              <Pressable
                key={item._id}
                style={styles.confirmed}
                onPress={() => setResponding(item)}
              >
                <RequestHead reservation={item} />

                {item.status !== "confirmed" ? (
                  <Text
                    style={[
                      styles.doorTag,
                      item.status === "no_show" && { color: T.danger },
                    ]}
                  >
                    {item.status === "seated" ? "Ήρθαν" : "Δεν ήρθαν"}
                  </Text>
                ) : null}
              </Pressable>
            ))
          ) : (
            <Text style={styles.empty}>Καμία κράτηση για αυτή τη βραδιά.</Text>
          )}
        </View>
      </ScrollView>

      <VenueBookingSheet
        reservation={responding}
        onClose={() => setResponding(null)}
        onUpdated={(updated) => {
          applyUpdate(updated);
          setResponding(null);
          load();
        }}
      />
    </SafeAreaView>
  );
}

function RequestHead({ reservation }) {
  return (
    <View style={styles.requestHead}>
      <Avatar
        uri={reservation.user?.profileImageUrl}
        name={reservation.user?.username}
        size={38}
      />

      <View style={styles.requestText}>
        <Text style={styles.guest} numberOfLines={1}>
          {reservation.contactName || reservation.user?.username || "Χρήστης"}
        </Text>

        <View style={styles.requestFacts}>
          <View style={styles.factRow}>
            <Users size={11} color={T.textFaint} strokeWidth={2.2} />
            <Text style={styles.fact}>{reservation.partySize}</Text>
          </View>

          {reservation.arrivalTime ? (
            <View style={styles.factRow}>
              <Clock size={11} color={T.textFaint} strokeWidth={2.2} />
              <Text style={styles.fact}>{reservation.arrivalTime}</Text>
            </View>
          ) : null}

          {reservation.tableLabel ? (
            <Text style={styles.table}>Τ{reservation.tableLabel}</Text>
          ) : null}
        </View>

        {reservation.contactPhone ? (
          <Text style={styles.phone}>{reservation.contactPhone}</Text>
        ) : null}
      </View>
    </View>
  );
}
