import { useCallback, useContext, useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";
import ChevronLeft from "lucide-react-native/dist/esm/icons/chevron-left";
import ScanLine from "lucide-react-native/dist/esm/icons/scan-line";
import X from "lucide-react-native/dist/esm/icons/x";
import BadgeCheck from "lucide-react-native/dist/esm/icons/badge-check";
import Check from "lucide-react-native/dist/esm/icons/check";

import QrScanner from "@/components/QrScanner";
import TriangleLoader from "@/components/TriangleLoader";
import { SocketContext } from "@/context/SocketContext";
import { API_URL } from "@/constants/api";
import { formatTimeAgo } from "@/utils/format";
import { useStyles, useTheme } from "@/styles/theme";
import styleSheet from "./CouponsScreen.styles";

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

/**
 * Stamp cards and the drinks they have earned.
 *
 * Written to be understood without instructions: one big button that does the
 * only thing there is to do, progress drawn as dots you can count rather than a
 * percentage, and a coupon that is a code on a white plate — the same shape as
 * every ticket anyone has ever been handed at a door.
 */
export default function CouponsScreen() {
  const T = useTheme();
  const styles = useStyles(styleSheet);

  const navigation = useNavigation();
  const socket = useContext(SocketContext);

  const [cards, setCards] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await call("/users/me/coupons");
      setCards(data.cards ?? []);
      setCoupons(data.coupons ?? []);
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

  /* --- the bar scans the coupon while it is on screen --- */
  useEffect(() => {
    if (!socket) return undefined;

    const onRedeemed = ({ _id, redeemedAt }) => {
      const spend = (coupon) =>
        String(coupon._id) === String(_id)
          ? { ...coupon, redeemed: true, redeemedAt, usable: false }
          : coupon;

      setCoupons((prev) => prev.map(spend));
      setOpen((prev) => (prev ? spend(prev) : prev));
    };

    socket.on("reward:redeemed", onRedeemed);
    return () => socket.off("reward:redeemed", onRedeemed);
  }, [socket]);

  const onScan = async (payload) => {
    try {
      const result = await call("/stores/stamp", {
        method: "POST",
        body: { payload },
      });

      setScanning(false);
      await load();

      const { store, card, reward, alreadyStamped } = result;

      if (reward) {
        Alert.alert(
          "Κέρδισες! 🎉",
          `Γέμισες την κάρτα στο ${store.name}.\n\nΔείξε το κουπόνι στο μπαρ για ${reward.rewardLabel}.`,
        );
        return;
      }

      if (alreadyStamped) {
        Alert.alert(
          "Είσαι μέσα",
          `Έχεις ήδη τη σφραγίδα σου για απόψε στο ${store.name}.`,
        );
        return;
      }

      const left = card.stampsForReward - (card.stamps % card.stampsForReward);
      Alert.alert(
        "+1 σφραγίδα ✓",
        `${store.name}\n\nΆλλες ${left} ${left === 1 ? "βραδιά" : "βραδιές"} για ${card.rewardLabel || "δωρεάν ποτό"}.`,
      );
    } catch (err) {
      setScanning(false);
      Alert.alert("Δεν έγινε", err.message);
    }
  };

  const ready = coupons.filter((c) => c.usable);
  const spent = coupons.filter((c) => !c.usable);

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
        <Text style={styles.headerTitle}>Τα κουπόνια μου</Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <TriangleLoader color={T.primary} size={44} />
        </View>
      ) : (
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
          {/* ---- the only thing to do on this screen ---- */}
          <Pressable
            style={({ pressed }) => [styles.scan, pressed && { opacity: 0.85 }]}
            onPress={() => setScanning(true)}
          >
            <ScanLine size={34} color="#fff" strokeWidth={2.2} />
            <Text style={styles.scanTitle}>Σκάναρε το QR του μαγαζιού</Text>
            <Text style={styles.scanHint}>
              Κάθε βραδιά μετράει 1 σφραγίδα
            </Text>
          </Pressable>

          {/* ---- drinks already earned ---- */}
          {ready.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Έτοιμα κουπόνια</Text>

              {ready.map((coupon) => (
                <Pressable
                  key={String(coupon._id)}
                  style={styles.coupon}
                  onPress={() => setOpen(coupon)}
                >
                  <Image
                    source={{ uri: coupon.store.image }}
                    style={styles.couponImage}
                  />

                  <View style={styles.couponText}>
                    <Text style={styles.couponReward} numberOfLines={1}>
                      {coupon.rewardLabel}
                    </Text>
                    <Text style={styles.couponVenue} numberOfLines={1}>
                      {coupon.store.name}
                    </Text>
                  </View>

                  <View style={styles.couponShow}>
                    <Text style={styles.couponShowText}>ΔΕΙΞΕ ΤΟ</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* ---- cards being filled ---- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Οι κάρτες μου</Text>

            {cards.length ? (
              cards.map((card) => (
                <View key={String(card.store._id)} style={styles.card}>
                  <View style={styles.cardHead}>
                    <Image
                      source={{ uri: card.store.image }}
                      style={styles.cardImage}
                    />

                    <View style={styles.cardText}>
                      <Text style={styles.cardVenue} numberOfLines={1}>
                        {card.store.name}
                      </Text>
                      <Text style={styles.cardReward} numberOfLines={1}>
                        {card.rewardLabel}
                      </Text>
                    </View>
                  </View>

                  {/* Dots, not a bar: five things you can count at arm's
                      length, which is how a paper stamp card reads. */}
                  <View style={styles.dots}>
                    {Array.from({ length: card.stampsForReward }).map(
                      (_, index) => {
                        const filled = index < card.progress;

                        return (
                          <View
                            key={index}
                            style={[styles.dot, filled && styles.dotFilled]}
                          >
                            {filled ? (
                              <Check
                                size={15}
                                color="#fff"
                                strokeWidth={3}
                              />
                            ) : null}
                          </View>
                        );
                      },
                    )}
                  </View>

                  <Text style={styles.cardRemaining}>
                    {card.remaining === 0
                      ? "Γέμισε! Δες το κουπόνι σου πιο πάνω."
                      : `Άλλες ${card.remaining} ${card.remaining === 1 ? "βραδιά" : "βραδιές"}`}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                Δεν έχεις ξεκινήσει κάρτα ακόμα. Σκάναρε το QR του μαγαζιού την
                επόμενη φορά που θα βγεις.
              </Text>
            )}
          </View>

          {/* ---- history ---- */}
          {spent.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Έχουν χρησιμοποιηθεί</Text>

              {spent.map((coupon) => (
                <View key={String(coupon._id)} style={styles.spent}>
                  <BadgeCheck size={18} color={T.accent} strokeWidth={2.4} />
                  <Text style={styles.spentText} numberOfLines={1}>
                    {coupon.rewardLabel} · {coupon.store.name}
                  </Text>
                  <Text style={styles.spentWhen}>
                    {formatTimeAgo(coupon.redeemedAt)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}

      <QrScanner
        visible={scanning}
        onClose={() => setScanning(false)}
        onScan={onScan}
        hint="Σκάναρε το QR που έχει το μαγαζί στο ταμείο ή στο τραπέζι."
      />

      {/* ---- the coupon itself, for the bar to scan ---- */}
      <Modal
        visible={!!open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(null)}
      >
        <View style={styles.qrBackdrop}>
          <Pressable
            style={styles.qrBackdropTap}
            onPress={() => setOpen(null)}
          />

          <View style={styles.qrCard}>
            <Pressable
              style={styles.qrClose}
              onPress={() => setOpen(null)}
              hitSlop={8}
            >
              <X size={18} color={T.text} strokeWidth={2.4} />
            </Pressable>

            <Text style={styles.qrVenue}>{open?.store?.name}</Text>
            <Text style={styles.qrReward} numberOfLines={2}>
              {open?.rewardLabel}
            </Text>

            {open?.redeemed ? (
              <>
                <View style={styles.qrDone}>
                  <BadgeCheck size={88} color={T.accent} strokeWidth={2} />
                </View>
                <Text style={styles.qrDoneText}>Εξαργυρώθηκε</Text>
              </>
            ) : (
              <>
                {/* White plate: scanners need the contrast and the app is dark
                    around it. */}
                <View style={styles.qrPlate}>
                  {open ? (
                    <QRCode value={open.qr} size={196} backgroundColor="#fff" />
                  ) : null}
                </View>

                <Text style={styles.qrCode}>{open?.code}</Text>
                <Text style={styles.qrHint}>
                  Δείξ&apos; το στο μπαρ. Αν δεν έχουν scanner, πες τους τον
                  κωδικό.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
