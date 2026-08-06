import { useCallback, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import ChevronLeft from "lucide-react-native/dist/esm/icons/chevron-left";
import CreditCard from "lucide-react-native/dist/esm/icons/credit-card";
import TriangleAlert from "lucide-react-native/dist/esm/icons/triangle-alert";
import Check from "lucide-react-native/dist/esm/icons/check";
import Clock from "lucide-react-native/dist/esm/icons/clock";
import ReceiptText from "lucide-react-native/dist/esm/icons/receipt-text";

import { API_URL } from "@/constants/api";
import { formatFullDate } from "@/utils/format";
import { useStyles, useTheme } from "@/styles/theme";
import styleSheet from "./BillingScreen.styles";

const call = async (path, { method = "GET" } = {}) => {
  const res = await fetch(`${API_URL}${path}`, { method, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Σφάλμα ${res.status}`);
  return data;
};

// How each subscription state reads to the venue. The lapsed one says what it
// actually costs them — "not visible on the map" lands harder than "inactive".
const STATE = (T) => ({
  trial: {
    tone: T.warning,
    Icon: Clock,
    title: (s) =>
      `Δοκιμαστική περίοδος · ${s.trialDaysLeft} ${s.trialDaysLeft === 1 ? "μέρα" : "μέρες"} ακόμα`,
    detail: (s) => `Λήγει ${formatFullDate(s.trialEndsAt)}.`,
    action: "Ενεργοποίηση συνδρομής",
  },
  active: {
    tone: T.accent,
    Icon: Check,
    title: () => "Ενεργή συνδρομή",
    detail: (s) =>
      s.cancelAtPeriodEnd
        ? `Ακυρώνεται στις ${formatFullDate(s.currentPeriodEnd)}.`
        : s.currentPeriodEnd
          ? `Ανανεώνεται ${formatFullDate(s.currentPeriodEnd)}.`
          : "",
    action: "Διαχείριση",
  },
  past_due: {
    tone: T.warning,
    Icon: TriangleAlert,
    title: () => "Η πληρωμή δεν πέρασε",
    detail: () =>
      "Το μαγαζί φαίνεται ακόμα κανονικά, αλλά ενημέρωσε την κάρτα σου σύντομα.",
    action: "Ενημέρωση κάρτας",
  },
  lapsed: {
    tone: T.danger,
    Icon: TriangleAlert,
    title: () => "Δεν φαίνεσαι στον χάρτη",
    detail: () =>
      "Χωρίς συνδρομή το μαγαζί δεν εμφανίζεται και δεν δέχεται νέες κρατήσεις. Οι υπάρχουσες κρατήσεις ισχύουν κανονικά.",
    action: "Ενεργοποίηση συνδρομής",
  },
});

const stateOf = (sub) => {
  // A paid subscription outranks a trial that has not run out yet — a venue
  // that has already bought must never be shown a "subscribe" button.
  if (sub.plan === "past_due") return "past_due";
  if (sub.hasSubscription && sub.entitled) return "active";
  if (sub.onTrial) return "trial";
  if (sub.entitled) return "active";
  return "lapsed";
};

export default function BillingScreen() {
  const T = useTheme();
  const styles = useStyles(styleSheet);

  const navigation = useNavigation();

  const [venues, setVenues] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const [mine, bills] = await Promise.all([
        call("/billing/mine"),
        call("/billing/invoices").catch(() => []),
      ]);
      setVenues(mine);
      setInvoices(bills);
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetched on focus, because payment happens in the browser and the webhook
  // updates the record while the app is in the background.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = async (path, storeId) => {
    setBusy(storeId ?? "portal");
    try {
      const { url } = await call(path, { method: "POST" });
      await WebBrowser.openBrowserAsync(url);
      // Whatever they did in there, the truth is now on the server.
      await load();
    } catch (err) {
      Alert.alert("Δεν άνοιξε", err.message);
    } finally {
      setBusy(null);
    }
  };

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
        <Text style={styles.headerTitle}>Συνδρομή</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={T.primary} style={styles.loader} />
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
          {venues.length > 1 ? (
            <Text style={styles.note}>
              Κάθε μαγαζί έχει τη δική του συνδρομή, αλλά όλα χρεώνονται στην
              ίδια κάρτα.
            </Text>
          ) : null}

          {venues.map(({ store, ...sub }) => {
            const key = stateOf(sub);
            const { tone, Icon, title, detail, action } = STATE(T)[key];

            return (
              <View key={store._id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Image source={{ uri: store.image }} style={styles.image} />
                  <Text style={styles.venue} numberOfLines={1}>
                    {store.name}
                  </Text>
                </View>

                <View style={[styles.state, { backgroundColor: `${tone}1A` }]}>
                  <Icon size={16} color={tone} strokeWidth={2.4} />
                  <View style={styles.stateText}>
                    <Text style={[styles.stateTitle, { color: tone }]}>
                      {title(sub)}
                    </Text>
                    {detail(sub) ? (
                      <Text style={styles.stateDetail}>{detail(sub)}</Text>
                    ) : null}
                  </View>
                </View>

                <Pressable
                  style={[
                    styles.action,
                    key === "active" || key === "past_due"
                      ? styles.actionSecondary
                      : styles.actionPrimary,
                  ]}
                  disabled={busy != null}
                  onPress={() =>
                    sub.hasSubscription
                      ? open("/billing/portal")
                      : open(`/billing/checkout/${store._id}`, store._id)
                  }
                >
                  {busy === store._id || (busy === "portal" && sub.hasSubscription) ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <CreditCard
                        size={15}
                        color={
                          key === "active" || key === "past_due" ? T.text : "#fff"
                        }
                        strokeWidth={2.2}
                      />
                      <Text
                        style={[
                          styles.actionText,
                          key !== "active" && key !== "past_due" && {
                            color: "#fff",
                          },
                        ]}
                      >
                        {action}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}

          {invoices.length ? (
            <View style={styles.invoices}>
              <Text style={styles.sectionTitle}>Τιμολόγια</Text>

              {invoices.map((invoice) => (
                <Pressable
                  key={invoice._id}
                  style={styles.invoice}
                  onPress={() =>
                    invoice.invoiceUrl &&
                    WebBrowser.openBrowserAsync(invoice.invoiceUrl)
                  }
                >
                  <ReceiptText size={15} color={T.textFaint} strokeWidth={2.2} />
                  <Text style={styles.invoiceDate}>
                    {formatFullDate(invoice.paidAt)}
                  </Text>
                  <Text style={styles.invoiceAmount}>
                    {(invoice.amount / 100).toFixed(2)}{" "}
                    {invoice.currency?.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={styles.footnote}>
            Η πληρωμή γίνεται μέσω Stripe. Η Vibely δεν αποθηκεύει στοιχεία
            κάρτας.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
