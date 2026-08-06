import { useCallback, useContext, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import ChevronLeft from "lucide-react-native/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react-native/dist/esm/icons/chevron-right";
import Users from "lucide-react-native/dist/esm/icons/users";
import Clock from "lucide-react-native/dist/esm/icons/clock";
import Check from "lucide-react-native/dist/esm/icons/check";
import X from "lucide-react-native/dist/esm/icons/x";
import StoreIcon from "lucide-react-native/dist/esm/icons/store";
import Radio from "lucide-react-native/dist/esm/icons/radio";
import KeyRound from "lucide-react-native/dist/esm/icons/key-round";
import ChartNoAxesColumn from "lucide-react-native/dist/esm/icons/chart-no-axes-column";
import Tag from "lucide-react-native/dist/esm/icons/tag";
import TriangleAlert from "lucide-react-native/dist/esm/icons/triangle-alert";
import CreditCard from "lucide-react-native/dist/esm/icons/credit-card";
import QrCode from "lucide-react-native/dist/esm/icons/qr-code";
import QRCode from "react-native-qrcode-svg";
import BadgeCheck from "lucide-react-native/dist/esm/icons/badge-check";

import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import QrScanner from "@/components/QrScanner";
import VenueBookingSheet from "./VenueBookingSheet";
import { SocketContext } from "@/context/SocketContext";
import { API_URL } from "@/constants/api";
import {
  currentNightKey,
  formatClock,
  formatNightKey,
  toDateKey,
} from "@/utils/format";
import { useStyles, useTheme } from "@/styles/theme";
import styleSheet from "./VenueScreen.styles";

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
const CROWD = (T) => [
  { key: "quiet", label: "Ήσυχα", color: T.textMuted },
  { key: "filling", label: "Γεμίζει", color: T.accent },
  { key: "busy", label: "Γεμάτο", color: T.warning },
  { key: "packed", label: "Ουρά", color: T.danger },
];

// How long a stamp card runs. Offered as taps rather than a number field so
// setting it is one gesture and there is nothing to type wrong.
const NIGHT_OPTIONS = [3, 4, 5, 6, 8, 10];

// Move a day without a date picker: nights are always near.
const shiftKey = (key, days) => {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

// The venue's night: pending requests to answer, confirmed tables to seat, and
// the two switches (live status, check-in code) that only matter tonight.
export default function VenueScreen() {
  const T = useTheme();
  const styles = useStyles(styleSheet);

  const navigation = useNavigation();
  const socket = useContext(SocketContext);

  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);

  const [dateKey, setDateKey] = useState(currentNightKey());
  const [sheet, setSheet] = useState(null);
  const [code, setCode] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState(null);

  const [offerTitle, setOfferTitle] = useState("");
  const [offerUntil, setOfferUntil] = useState("23:00");
  const [offerBusy, setOfferBusy] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [redemptions, setRedemptions] = useState([]);
  const [nightsBusy, setNightsBusy] = useState(false);

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
      const [night, doorCode, redeemed] = await Promise.all([
        call(`/reservations/store/${storeId}?dateKey=${dateKey}`),
        call(`/stores/${storeId}/check-in-code`),
        call(`/stores/${storeId}/offer/redemptions`).catch(() => []),
      ]);
      setSheet(night);
      setCode(doorCode);
      setRedemptions(redeemed);
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

  const index = Math.max(
    0,
    stores.findIndex((s) => s._id === storeId),
  );
  const store = stores[index];
  const isTonight = dateKey === currentNightKey();

  // Wraps around, so three venues cycle rather than dead-ending at either edge.
  const step = (delta) => {
    if (stores.length < 2) return;
    const next = (index + delta + stores.length) % stores.length;
    setStoreId(stores[next]._id);
  };

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

  const saveOffer = async (clear = false) => {
    setOfferBusy(true);
    try {
      const { offer } = await call(`/stores/${storeId}/offer`, {
        method: "PUT",
        body: clear
          ? { title: null }
          : { title: offerTitle.trim(), until: offerUntil.trim() },
      });

      setStores((prev) =>
        prev.map((s) => (s._id === storeId ? { ...s, offer } : s)),
      );
      if (clear) setOfferTitle("");
    } catch (err) {
      Alert.alert("Δεν αποθηκεύτηκε", err.message);
    } finally {
      setOfferBusy(false);
    }
  };

  // Newest scan first, and never the same claim twice — the socket echo and the
  // HTTP answer both land for whoever did the scanning.
  const rememberRedemption = (redemption) =>
    setRedemptions((prev) => [
      redemption,
      ...prev.filter((r) => String(r._id) !== String(redemption._id)),
    ]);

  const setNights = async (stampsForReward) => {
    setNightsBusy(true);
    try {
      const saved = await call(`/stores/${storeId}/loyalty`, {
        method: "PUT",
        body: { stampsForReward },
      });
      setCode((prev) => (prev ? { ...prev, ...saved } : prev));
    } catch (err) {
      Alert.alert("Δεν αποθηκεύτηκε", err.message);
    } finally {
      setNightsBusy(false);
    }
  };

  // One path for every way a code arrives: the four characters typed at the
  // bar, an offer QR, or a filled stamp card. The payload says which it is —
  // an offer and a free drink are different collections with different rules,
  // so they cannot share an endpoint.
  const redeem = async (raw) => {
    const value = String(raw ?? "").trim();
    if (!value) return;

    const isReward = value.toLowerCase().startsWith("vibely:reward:");
    const path = isReward
      ? `/stores/${storeId}/reward/redeem`
      : `/stores/${storeId}/offer/redeem`;

    try {
      const { guest, redemption } = await call(path, {
        method: "POST",
        body: { code: value },
      });

      setRedeemCode("");
      setScanning(false);
      if (redemption) rememberRedemption(redemption);

      Alert.alert(
        "Ισχύει ✓",
        isReward
          ? `${guest?.username ?? "Ο πελάτης"} γέμισε την κάρτα — κέρασέ τον ${redemption?.offerTitle ?? "το ποτό"}.`
          : `${guest?.username ?? "Ο πελάτης"} — δώσ' του την προσφορά.`,
      );
    } catch (err) {
      setScanning(false);
      Alert.alert("Άκυρο", err.message);
    }
  };

  // A second phone on the door scanning the same queue: both lists stay whole
  // rather than each keeping only what it read itself.
  useEffect(() => {
    if (!socket) return undefined;

    const onRedeemed = (redemption) => {
      if (String(redemption?.store?._id) !== String(storeId)) return;
      rememberRedemption(redemption);
    };

    socket.on("offer:redeemed:venue", onRedeemed);
    return () => socket.off("offer:redeemed:venue", onRedeemed);
  }, [socket, storeId]);

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
        {/* A trial that lapses quietly costs the venue its map pin, so it is
            called out above everything else once it is close. */}
        {store?.subscription && !store.subscription.entitled ? (
          <Pressable
            style={[styles.billing, styles.billingLapsed]}
            onPress={() => navigation.navigate("Billing")}
          >
            <TriangleAlert size={15} color={T.danger} strokeWidth={2.4} />
            <Text style={[styles.billingText, { color: T.danger }]}>
              Δεν φαίνεσαι στον χάρτη — ενεργοποίησε συνδρομή
            </Text>
            <ChevronRight size={16} color={T.danger} strokeWidth={2.2} />
          </Pressable>
        ) : store?.subscription?.onTrial &&
          store.subscription.trialDaysLeft <= 5 ? (
          <Pressable
            style={[styles.billing, styles.billingTrial]}
            onPress={() => navigation.navigate("Billing")}
          >
            <Clock size={15} color={T.warning} strokeWidth={2.4} />
            <Text style={[styles.billingText, { color: T.warning }]}>
              Η δοκιμή λήγει σε {store.subscription.trialDaysLeft}{" "}
              {store.subscription.trialDaysLeft === 1 ? "μέρα" : "μέρες"}
            </Text>
            <ChevronRight size={16} color={T.warning} strokeWidth={2.2} />
          </Pressable>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>Μαγαζί</Text>

          {/* Always reachable. The banners below only appear when the trial is
              nearly out, and billing has to be findable before then. */}
          <Pressable
            style={styles.headerIcon}
            onPress={() => navigation.navigate("Billing")}
            hitSlop={8}
          >
            <CreditCard size={18} color={T.textMuted} strokeWidth={2.3} />
          </Pressable>

          <Pressable
            style={styles.headerIcon}
            onPress={() => navigation.navigate("VenueAnalytics")}
            hitSlop={8}
          >
            <ChartNoAxesColumn size={18} color={T.primary} strokeWidth={2.3} />
          </Pressable>
        </View>

        {/* Which venue you are managing. Same row as an event card, rounded
            because this one sits on top rather than in a stacked list. */}
        {store ? (
          <View style={styles.storeCard}>
            <Image source={{ uri: store.images?.[0] }} style={styles.storeImage} />

            <View style={styles.storeBody}>
              <Text style={styles.storeName} numberOfLines={1}>
                {store.name}
              </Text>
              <Text style={styles.storeMeta} numberOfLines={1}>
                {store.area}
                {store.category ? ` · ${store.category}` : ""}
              </Text>

              {store.subscription ? (
                <Text
                  style={[
                    styles.storePlan,
                    !store.subscription.entitled && { color: T.danger },
                  ]}
                >
                  {store.subscription.onTrial
                    ? `Δοκιμή · ${store.subscription.trialDaysLeft} μέρες`
                    : store.subscription.entitled
                      ? "Ενεργή συνδρομή"
                      : "Χωρίς συνδρομή"}
                </Text>
              ) : null}
            </View>

            {stores.length > 1 ? (
              <View style={styles.switcher}>
                <Pressable
                  style={styles.switchArrow}
                  onPress={() => step(-1)}
                  hitSlop={6}
                >
                  <ChevronLeft size={17} color={T.text} strokeWidth={2.4} />
                </Pressable>

                <Text style={styles.switchCount}>
                  {index + 1}/{stores.length}
                </Text>

                <Pressable
                  style={styles.switchArrow}
                  onPress={() => step(1)}
                  hitSlop={6}
                >
                  <ChevronRight size={17} color={T.text} strokeWidth={2.4} />
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ---- live status: always about tonight ---- */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Radio size={15} color={T.primary} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Απόψε στον χάρτη</Text>
          </View>

          <View style={styles.crowdRow}>
            {CROWD(T).map(({ key, label, color }) => {
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

        {/* ---- tonight's offer: the answer to a dead Tuesday ---- */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Tag size={15} color={T.accent} strokeWidth={2.2} />
            <Text style={styles.cardTitle}>Προσφορά απόψε</Text>
          </View>

          {store?.offer ? (
            <>
              <View style={styles.offerLive}>
                <Text style={styles.offerLiveTitle}>{store.offer.title}</Text>
                <Text style={styles.offerLiveMeta}>
                  Έως {store.offer.until} · {store.offer.claimed} το πήραν
                  {store.offer.left != null ? ` · μένουν ${store.offer.left}` : ""}
                </Text>
              </View>

              <View style={styles.offerRow}>
                {/* The camera is the fast path — the guest holds their phone
                    up and nobody reads four characters out loud. Typing stays
                    for a cracked lens or a dead battery. */}
                <Pressable
                  style={styles.scanButton}
                  onPress={() => setScanning(true)}
                  hitSlop={6}
                >
                  <QrCode size={20} color={T.text} strokeWidth={2.2} />
                </Pressable>

                <TextInput
                  value={redeemCode}
                  onChangeText={setRedeemCode}
                  placeholder="Κωδικός πελάτη"
                  placeholderTextColor={T.textFaint}
                  style={styles.offerInput}
                  autoCapitalize="characters"
                  maxLength={4}
                />
                <Pressable
                  style={[styles.offerButton, styles.offerCheck]}
                  onPress={() => redeem(redeemCode)}
                  disabled={redeemCode.trim().length !== 4}
                >
                  <Text style={styles.offerButtonText}>Έλεγχος</Text>
                </Pressable>
              </View>

              {/* Who has already walked in on it. The door gets asked "did that
                  one go through?" constantly, and the answer has to be on the
                  same screen as the scanner. */}
              {redemptions.length ? (
                <View style={styles.redeemed}>
                  <Text style={styles.redeemedTitle}>
                    Πήραν την προσφορά ({redemptions.length})
                  </Text>

                  {redemptions.slice(0, 8).map((item) => (
                    <View key={String(item._id)} style={styles.redeemedRow}>
                      <Avatar
                        uri={item.guest?.profileImageUrl}
                        name={item.guest?.username}
                        size={30}
                      />

                      <Text style={styles.redeemedName} numberOfLines={1}>
                        {item.guest?.username ?? "Χρήστης"}
                      </Text>

                      <Text style={styles.redeemedCode}>{item.code}</Text>
                      <BadgeCheck size={16} color={T.accent} strokeWidth={2.4} />
                      <Text style={styles.redeemedTime}>
                        {item.redeemedAt ? formatClock(item.redeemedAt) : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable onPress={() => saveOffer(true)} disabled={offerBusy}>
                <Text style={styles.offerClear}>Τερματισμός προσφοράς</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                value={offerTitle}
                onChangeText={setOfferTitle}
                placeholder="π.χ. −20% σε όλα τα cocktails"
                placeholderTextColor={T.textFaint}
                style={styles.offerInputFull}
                maxLength={80}
              />

              <View style={styles.offerRow}>
                <TextInput
                  value={offerUntil}
                  onChangeText={setOfferUntil}
                  placeholder="23:00"
                  placeholderTextColor={T.textFaint}
                  style={styles.offerInput}
                  maxLength={5}
                  keyboardType="numbers-and-punctuation"
                />
                <Pressable
                  style={[
                    styles.offerButton,
                    styles.offerSend,
                    (!offerTitle.trim() || offerBusy) && { opacity: 0.45 },
                  ]}
                  onPress={() => saveOffer(false)}
                  disabled={!offerTitle.trim() || offerBusy}
                >
                  <Text style={[styles.offerButtonText, { color: "#fff" }]}>
                    Δημοσίευση
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.cardHint}>
                Το βλέπουν όσοι είναι κοντά απόψε. Λήγει μόνο του στην ώρα που
                θα βάλεις.
              </Text>
            </>
          )}
        </View>

        {/* ---- tonight's stamp QR ----
             This is what a guest scans to get their stamp, so it is meant to be
             left on screen at the till or printed and stuck on the tables. The
             code underneath is the same thing for a guest whose camera is
             broken. Both change on their own every night. */}
        {code?.enabled ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <KeyRound size={15} color={T.accent} strokeWidth={2.2} />
              <Text style={styles.cardTitle}>QR βραδιάς</Text>
            </View>

            <View style={styles.stampPlate}>
              {code.qr ? (
                <QRCode value={code.qr} size={190} backgroundColor="#fff" />
              ) : null}
            </View>

            <Text style={styles.stampLead}>
              Οι πελάτες το σκανάρουν για 1 σφραγίδα
            </Text>

            <View style={styles.codeRow}>
              <View>
                <Text style={styles.codeLabel}>Κωδικός</Text>
                <Text style={styles.code}>{code.code}</Text>
              </View>

              <View style={styles.codeMeta}>
                <Text style={styles.codeCount}>{code.checkedIn}</Text>
                <Text style={styles.codeLabel}>σφραγίδες απόψε</Text>
              </View>
            </View>

            {/* ---- how long the card is ---- */}
            <Text style={styles.cardHint}>
              Μετά από πόσες βραδιές κερδίζουν{" "}
              {code.rewardLabel || "δωρεάν ποτό"};
            </Text>

            <View style={styles.nightsRow}>
              {NIGHT_OPTIONS.map((n) => {
                const active = (code.stampsForReward ?? 5) === n;

                return (
                  <Pressable
                    key={n}
                    style={[styles.nightsOption, active && styles.nightsOptionActive]}
                    onPress={() => setNights(n)}
                    disabled={nightsBusy}
                  >
                    <Text
                      style={[
                        styles.nightsOptionText,
                        active && styles.nightsOptionTextActive,
                      ]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.cardHint}>
              Οι κάρτες που έχουν ήδη γεμίσει δεν χαλάνε αν το αλλάξεις.
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

      <QrScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onScan={redeem}
        hint="Κράτα το QR του πελάτη μέσα στο πλαίσιο. Ο κωδικός καίγεται με το πρώτο σκανάρισμα."
      />
    </SafeAreaView>
  );
}

function RequestHead({ reservation }) {
  const T = useTheme();
  const styles = useStyles(styleSheet);
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
