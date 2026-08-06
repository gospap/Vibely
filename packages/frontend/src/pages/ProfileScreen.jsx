import { useCallback, useContext, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import Pencil from "lucide-react-native/dist/esm/icons/pencil";
import LogOut from "lucide-react-native/dist/esm/icons/log-out";
import CalendarDays from "lucide-react-native/dist/esm/icons/calendar-days";
import Users from "lucide-react-native/dist/esm/icons/users";
import CalendarCheck from "lucide-react-native/dist/esm/icons/calendar-check";
import Gift from "lucide-react-native/dist/esm/icons/gift";
import ChevronRight from "lucide-react-native/dist/esm/icons/chevron-right";
import Ticket from "lucide-react-native/dist/esm/icons/ticket";
// Aliased: CreditCard here is the card face component, not the glyph.
import CreditCardIcon from "lucide-react-native/dist/esm/icons/credit-card";
import Check from "lucide-react-native/dist/esm/icons/check";
import ScanLine from "lucide-react-native/dist/esm/icons/scan-line";
import Moon from "lucide-react-native/dist/esm/icons/moon";
import Sun from "lucide-react-native/dist/esm/icons/sun";

import { AuthContext } from "@/context/AuthContext";
import Avatar from "@/components/Avatar";
import CardStack from "@/components/CardStack";
import TriangleLoader from "@/components/TriangleLoader";
import EditProfileModal from "./EditProfileModal";
import { API_URL } from "@/constants/api";
import { formatEventDate, formatFullDate } from "@/utils/format";
import { useStyles, useTheme, useThemeControls } from "@/styles/theme";
import styleSheet from "./ProfileScreen.styles";

// Session cookie or the API treats every call as a stranger.
const call = async (path, { method = "GET", body } = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Σφάλμα ${res.status}`);
  return res.json();
};

// Toggle rows are all the same shape, so the notification block is data.
//
// `venue` marks the ones a business account has any use for. The rest are about
// going out — friend requests, event reminders, DMs — and a venue has no
// Community tab to receive any of it in, so showing the switches would only
// promise something the app never does.
const NOTIFICATION_ROWS = [
  { key: "push", label: "Push ειδοποιήσεις", venue: true },
  { key: "messages", label: "Νέα μηνύματα" },
  { key: "friendRequests", label: "Αιτήματα φιλίας" },
  { key: "eventReminders", label: "Υπενθυμίσεις για events" },
  { key: "email", label: "Email ενημερώσεις", venue: true },
];

// None of these apply to a venue: it is on the map on purpose, and it does not
// check in anywhere or attend its own nights as a guest.
const PRIVACY_ROWS = [
  { key: "discoverable", label: "Να με βρίσκουν στην αναζήτηση" },
  { key: "showAttendance", label: "Να φαίνεται σε ποια events πάω" },
  { key: "showCheckIns", label: "Να φαίνεται στους φίλους πού κάνω check-in" },
];

// Two explicit choices rather than a switch: "Σκοτεινό / Φωτεινό" says what it
// does, where a toggle labelled "Dark mode" leaves you guessing which way is on.
const THEMES = [
  { key: "dark", label: "Σκοτεινό", Icon: Moon },
  { key: "light", label: "Φωτεινό", Icon: Sun },
];

// Stripe reports amounts in the currency's smallest unit.
const formatMoney = (cents = 0, currency = "eur") =>
  `${(cents / 100).toFixed(2).replace(".", ",")} ${currency.toUpperCase()}`;

export default function ProfileScreen() {
  const T = useTheme();
  const styles = useStyles(styleSheet);
  const { scheme, setScheme } = useThemeControls();

  const { user, logout, refresh } = useContext(AuthContext);
  const navigation = useNavigation();

  const [prefs, setPrefs] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loyalty, setLoyalty] = useState([]);
  const [venues, setVenues] = useState([]);
  const [cards, setCards] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [billing, setBilling] = useState([]);
  // Whichever card the owner has pulled to the front of the stack — the one an
  // "assign to this venue" tap will use.
  const [activeCard, setActiveCard] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);

  // A venue account is running a business here, not going out. Stamp cards,
  // friends and "events I'm attending" mean nothing to it, so it gets its own
  // numbers and its own tools rather than a guest screen with extras bolted on.
  const isTenant = user?.type === "tenant";

  // Everything Vibely has ever charged this account, across all its venues.
  // Zero is a real answer here, not an empty state — a venue still on trial has
  // paid nothing yet and the panel says so.
  const spent = {
    amount: invoices.reduce((sum, invoice) => sum + (invoice.amount ?? 0), 0),
    currency: invoices[0]?.currency ?? "eur",
  };

  // The soonest renewal across the venues. A tenant with three bars is billed
  // three times on three dates; the one that matters is the next one.
  const nextCharge = billing
    .filter((row) => row.currentPeriodEnd && !row.cancelAtPeriodEnd)
    .map((row) => new Date(row.currentPeriodEnd))
    .sort((a, b) => a - b)[0];

  const notificationRows = NOTIFICATION_ROWS.filter(
    (row) => !isTenant || row.venue,
  );

  const load = useCallback(async () => {
    try {
      if (isTenant) {
        // A venue's wallet is what it pays with and what it has been charged —
        // it never holds offer codes, because a venue hands those out rather
        // than redeeming them. Each of these degrades to empty on its own so
        // one unconfigured Stripe key cannot blank the whole screen.
        const [preferences, mine, methods, charges, subs] = await Promise.all([
          call("/users/me/preferences"),
          call("/stores/mine"),
          call("/billing/payment-methods").catch(() => []),
          call("/billing/invoices").catch(() => []),
          call("/billing/mine").catch(() => []),
        ]);

        setPrefs(preferences);
        setVenues(mine);
        setCards(methods);
        setInvoices(charges);
        setBilling(subs);
        return;
      }

      const [preferences, events, mates, cards] = await Promise.all([
        call("/users/me/preferences"),
        call("/users/me/events"),
        call("/users/me/friends"),
        call("/users/me/loyalty"),
      ]);
      setPrefs(preferences);
      setMyEvents(events);
      setFriends(mates);
      setLoyalty(cards);
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isTenant]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Flip the switch immediately, then persist. Roll back if the API says no.
  const setNotification = async (key, value) => {
    const previous = prefs;
    setPrefs((p) => ({
      ...p,
      notifications: { ...p.notifications, [key]: value },
    }));

    try {
      const saved = await call("/users/me/preferences", {
        method: "PUT",
        body: { notifications: { [key]: value } },
      });
      setPrefs(saved);
    } catch (err) {
      setPrefs(previous);
      Alert.alert("Δεν αποθηκεύτηκε", err.message);
    }
  };

  const setPrivacy = async (key, value) => {
    const previous = prefs;
    setPrefs((p) => ({ ...p, privacy: { ...p.privacy, [key]: value } }));

    try {
      const saved = await call("/users/me/preferences", {
        method: "PUT",
        body: { privacy: { [key]: value } },
      });
      setPrefs(saved);
    } catch (err) {
      setPrefs(previous);
      Alert.alert("Δεν αποθηκεύτηκε", err.message);
    }
  };

  // Point one venue's subscription at the card currently in front. Stripe keeps
  // the account on one customer, so this only overrides that single
  // subscription — the others carry on with whatever they were using.
  const assignCard = async (store) => {
    if (!activeCard) return;

    setAssigning(store._id);
    try {
      await call(`/billing/stores/${store._id}/payment-method`, {
        method: "PUT",
        body: { paymentMethodId: activeCard.id },
      });

      setBilling((prev) =>
        prev.map((row) =>
          row.store._id === store._id
            ? { ...row, paymentMethodId: activeCard.id }
            : row,
        ),
      );
    } catch (err) {
      Alert.alert("Δεν άλλαξε", err.message);
    } finally {
      setAssigning(null);
    }
  };

  const confirmLogout = () =>
    Alert.alert("Αποσύνδεση", "Σίγουρα θέλεις να αποσυνδεθείς;", [
      { text: "Άκυρο", style: "cancel" },
      { text: "Αποσύνδεση", style: "destructive", onPress: () => logout() },
    ]);

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <TriangleLoader color="#4F7CFF" size={40} />
        <Text style={styles.loadingText}>Φόρτωση προφίλ...</Text>
      </SafeAreaView>
    );
  }

  const avatarUri = user.profileImageUrl;

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
              refresh?.();
              load();
            }}
            tintColor={T.textMuted}
          />
        }
      >
        {/* ---- hero ----
             Guests only. An avatar, a display name and a bio are how a person
             is presented to other people; a venue is presented by its own page
             on the map, and this was showing the owner's personal card at the
             top of a business account. The account itself is still readable and
             editable from the Λογαριασμός section below. */}
        {isTenant ? null : (
        <View style={styles.hero}>
          <Pressable
            style={({ pressed }) => [styles.editIcon, pressed && { opacity: 0.6 }]}
            onPress={() => setEditing(true)}
            hitSlop={8}
          >
            <Pencil size={15} color={T.textMuted} strokeWidth={2.2} />
          </Pressable>

          <Avatar uri={avatarUri} name={user.username} size={88} />

          <Text style={styles.name}>{user.username || "Χρήστης"}</Text>
          <Text style={styles.email}>{user.email}</Text>
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

          {/* One strip with hairline dividers rather than three floating tiles. */}
          <View style={styles.stats}>
            <Stat value={myEvents.length} label="Events" />
            <View style={styles.statDivider} />
            <Stat value={friends.length} label="Φίλοι" />
            <View style={styles.statDivider} />
            <Stat value={user.savedStores?.length ?? 0} label="Αποθηκευμένα" />
          </View>
        </View>
        )}

        {/* ---- the tools for this kind of account ----
             Guests only. A venue reaches its shop from the Μαγαζί tab and its
             numbers from the chart icon on that screen, so these two rows were
             a second door onto places already one tap away. */}
        {/* The stamp card, given the top of the screen rather than a row in a
            list: it is the one thing here a guest is meant to open every time
            they go out, and it has to be findable without reading. */}
        {isTenant ? null : (
          <Pressable
            style={({ pressed }) => [
              styles.coupons,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => navigation.navigate("Coupons")}
          >
            <View style={styles.couponsIcon}>
              <ScanLine size={26} color="#fff" strokeWidth={2.2} />
            </View>

            <View style={styles.couponsText}>
              <Text style={styles.couponsTitle}>Τα κουπόνια μου</Text>
              <Text style={styles.couponsHint}>
                Σκάναρε το QR του μαγαζιού και μάζεψε σφραγίδες
              </Text>
            </View>

            <ChevronRight size={20} color="#fff" strokeWidth={2.4} />
          </Pressable>
        )}

        {isTenant ? null : (
          <View style={styles.group}>
            <LinkRow
              Icon={CalendarCheck}
              tone={T.primary}
              label="Οι κρατήσεις μου"
              onPress={() => navigation.navigate("MyBookings")}
            />
            <View style={styles.divider} />
            <LinkRow
              Icon={Ticket}
              tone={T.accent}
              label="Το πορτοφόλι μου"
              onPress={() => navigation.navigate("Wallet")}
            />
          </View>
        )}

        {/* ---- billing: the venue's own section, not a link to go hunting ---- */}
        {isTenant ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Συνδρομή</Text>
              <Pressable onPress={() => navigation.navigate("Billing")}>
                <Text style={styles.sectionAction}>Διαχείριση</Text>
              </Pressable>
            </View>

            <View style={styles.group}>
              {venues.map((venue, index) => {
                const sub = venue.subscription ?? {};
                const tone = !sub.entitled
                  ? T.danger
                  : sub.onTrial
                    ? T.warning
                    : T.accent;

                return (
                  <View key={venue._id}>
                    {index ? <View style={styles.divider} /> : null}

                    <Pressable
                      style={({ pressed }) => [
                        styles.billingRow,
                        pressed && { opacity: 0.6 },
                      ]}
                      onPress={() => navigation.navigate("Billing")}
                    >
                      <Image
                        source={{ uri: venue.images?.[0] }}
                        style={styles.billingImage}
                      />

                      <View style={styles.billingText}>
                        <Text style={styles.billingVenue} numberOfLines={1}>
                          {venue.name}
                        </Text>
                        <Text style={[styles.billingState, { color: tone }]}>
                          {sub.onTrial
                            ? `Δοκιμή · ${sub.trialDaysLeft} ${sub.trialDaysLeft === 1 ? "μέρα" : "μέρες"} ακόμα`
                            : sub.entitled
                              ? "Ενεργή"
                              : "Δεν φαίνεσαι στον χάρτη"}
                        </Text>
                      </View>

                      <ChevronRight
                        size={16}
                        color={T.textFaint}
                        strokeWidth={2.2}
                      />
                    </Pressable>
                  </View>
                );
              })}

              {!venues.length ? (
                <Text style={styles.billingEmpty}>
                  Ο λογαριασμός σου δεν είναι συνδεδεμένος με μαγαζί ακόμα.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ---- wallet: what the venue pays with, and what it has paid ----
             Rendered whole even with nothing in it. A venue on its free trial
             has no card and no charges yet, and showing it an empty frame
             reading 0,00 € tells it where the money will appear; an empty
             state would just look like something is missing. */}
        {isTenant ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Πορτοφόλι</Text>

            <View style={styles.group}>
              {/* ---- what it has cost so far ---- */}
              <View style={styles.walletTotals}>
                <View style={styles.walletTotalBlock}>
                  <Text style={styles.walletTotalLabel}>Σύνολο χρεώσεων</Text>
                  <Text style={styles.walletTotalValue}>
                    {formatMoney(spent.amount, spent.currency)}
                  </Text>
                </View>

                <View style={styles.walletTotalDivider} />

                <View style={styles.walletTotalBlock}>
                  <Text style={styles.walletTotalLabel}>Επόμενη χρέωση</Text>
                  <Text style={styles.walletNext}>
                    {nextCharge ? formatFullDate(nextCharge) : "—"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* ---- the card on file ----
                   Adding or replacing it happens in Stripe's hosted portal, so
                   this is a picture of the card and a way through to it —
                   never a form. */}
              <View style={styles.walletCardWrap}>
                <CardStack
                  cards={cards}
                  onSelect={setActiveCard}
                  onPress={() => navigation.navigate("Billing")}
                />
              </View>

              <View style={styles.divider} />

              {/* ---- which card pays for which bar ----
                   All venues ride the account's default card until one is given
                   its own, so this only appears once there is a choice to make. */}
              {cards.length > 1 && billing.some((b) => b.hasSubscription) ? (
                <>
                  <Text style={styles.walletCaption}>Χρέωση ανά μαγαζί</Text>

                  {billing
                    .filter((row) => row.hasSubscription)
                    .map((row) => {
                      const assigned =
                        cards.find((c) => c.id === row.paymentMethodId) ??
                        cards.find((c) => c.isDefault);

                      const alreadyOnFront =
                        activeCard && assigned?.id === activeCard.id;

                      return (
                        <Pressable
                          key={row.store._id}
                          style={({ pressed }) => [
                            styles.walletRow,
                            pressed && { opacity: 0.6 },
                          ]}
                          disabled={!activeCard || alreadyOnFront || assigning}
                          onPress={() => assignCard(row.store)}
                        >
                          <View style={styles.walletText}>
                            <Text style={styles.walletTitle} numberOfLines={1}>
                              {row.store.name}
                            </Text>
                            <Text style={styles.walletMeta} numberOfLines={1}>
                              {assigned
                                ? `···· ${assigned.last4}${assigned.name ? ` · ${assigned.name}` : ""}`
                                : "Κάρτα λογαριασμού"}
                            </Text>
                          </View>

                          {assigning === row.store._id ? (
                            <ActivityIndicator size="small" color={T.primary} />
                          ) : activeCard && !alreadyOnFront ? (
                            <Text style={styles.walletAssign}>
                              Χρέωσε ···· {activeCard.last4}
                            </Text>
                          ) : (
                            <Check size={16} color={T.accent} strokeWidth={2.6} />
                          )}
                        </Pressable>
                      );
                    })}

                  <View style={styles.divider} />
                </>
              ) : null}

              {/* ---- the charges themselves ---- */}
              <Text style={styles.walletCaption}>Χρεώσεις</Text>

              {invoices.length ? (
                invoices.slice(0, 4).map((invoice, index) => (
                  <View key={String(invoice._id)}>
                    {index ? <View style={styles.divider} /> : null}

                    <Pressable
                      style={({ pressed }) => [
                        styles.walletRow,
                        pressed && { opacity: 0.6 },
                      ]}
                      onPress={() =>
                        invoice.invoiceUrl &&
                        WebBrowser.openBrowserAsync(invoice.invoiceUrl)
                      }
                    >
                      <View style={styles.walletText}>
                        <Text style={styles.walletTitle} numberOfLines={1}>
                          {formatMoney(invoice.amount, invoice.currency)}
                        </Text>
                        <Text style={styles.walletMeta} numberOfLines={1}>
                          {formatFullDate(invoice.paidAt)}
                        </Text>
                      </View>

                      {invoice.invoiceUrl ? (
                        <Text style={styles.walletReceipt}>Απόδειξη</Text>
                      ) : null}
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.walletEmpty}>
                  Καμία χρέωση ακόμα. Η πρώτη γίνεται όταν τελειώσει η δοκιμή.
                </Text>
              )}

              {/* The one thing a venue comes to this section to do. It was a
                  four-word link in the header, which read as a caption rather
                  than a button — everything billing actually happens behind it,
                  so it gets the weight of one. */}
              <Pressable
                style={({ pressed }) => [
                  styles.walletManage,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => navigation.navigate("Billing")}
              >
                <CreditCardIcon size={18} color="#fff" strokeWidth={2.3} />

                <View style={styles.walletManageText}>
                  <Text style={styles.walletManageLabel}>
                    {cards.length ? "Διαχείριση πληρωμών" : "Πρόσθεσε κάρτα"}
                  </Text>
                  <Text style={styles.walletManageHint}>
                    Κάρτα, τιμολόγια, ακύρωση συνδρομής
                  </Text>
                </View>

                <ChevronRight size={18} color="#fff" strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ---- stamp cards ---- */}
        {!isTenant && loyalty.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Κάρτες πόντων</Text>

            {loyalty.map((card) => (
              <View key={card.store._id} style={styles.cardRow}>
                <Image source={{ uri: card.store.image }} style={styles.cardImage} />

                <View style={styles.cardText}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {card.store.name}
                  </Text>
                  <Text style={styles.cardReward} numberOfLines={1}>
                    {card.rewardLabel || "Κάρτα πόντων"}
                  </Text>

                  <View style={styles.cardTrack}>
                    <View
                      style={[
                        styles.cardFill,
                        {
                          width: `${(card.progress / card.stampsForReward) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.cardCount}>
                  <Gift size={13} color={T.accent} strokeWidth={2.2} />
                  <Text style={styles.cardCountText}>
                    {card.progress}/{card.stampsForReward}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ---- what a guest cares about: where they are going, who with ---- */}
        {!isTenant ? (
          <>
          {/* ---- upcoming events ---- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Τα events μου</Text>

            {loading ? (
              <ActivityIndicator color={T.primary} style={styles.loader} />
            ) : myEvents.length ? (
              myEvents.map((event) => (
                <Pressable
                  key={event._id}
                  style={styles.eventRow}
                  onPress={() => navigation.navigate("Events")}
                >
                  <Image
                    source={{ uri: event.images?.[0] }}
                    style={styles.eventImage}
                  />
                  <View style={styles.eventText}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text style={styles.eventMeta} numberOfLines={1}>
                      {formatEventDate(event.startDate)} · {event.startHour} ·{" "}
                      {event.store?.name}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyRow}>
                <CalendarDays size={16} color={T.textFaint} strokeWidth={2} />
                <Text style={styles.emptyText}>
                  Δεν έχεις δηλώσει συμμετοχή σε κάποιο event.
                </Text>
              </View>
            )}
          </View>

          {/* ---- friends ---- */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Φίλοι</Text>
              <Pressable onPress={() => navigation.navigate("Community")}>
                <Text style={styles.sectionAction}>Όλοι</Text>
              </Pressable>
            </View>

            {friends.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.friendsRow}
              >
                {friends.map((friend) => (
                  <Pressable
                    key={friend._id}
                    style={styles.friend}
                    onPress={() =>
                      navigation.navigate("UserProfile", { userId: friend._id })
                    }
                  >
                    <Avatar
                      uri={friend.profileImageUrl}
                      name={friend.username}
                      size={56}
                    />
                    <Text style={styles.friendName} numberOfLines={1}>
                      {friend.username}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyRow}>
                <Users size={16} color={T.textFaint} strokeWidth={2} />
                <Text style={styles.emptyText}>Δεν έχεις φίλους ακόμα.</Text>
              </View>
            )}
          </View>
          </>
        ) : null}

        {/* ---- appearance ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Εμφάνιση</Text>

          <View style={styles.themeRow}>
            {THEMES.map(({ key, label, Icon }) => {
              const active = scheme === key;

              return (
                <Pressable
                  key={key}
                  style={[styles.themeOption, active && styles.themeActive]}
                  onPress={() => setScheme(key)}
                >
                  <Icon
                    size={17}
                    color={active ? T.primary : T.textMuted}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      active && { color: T.primary },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ---- preferences ---- */}
        {prefs ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ειδοποιήσεις</Text>

              <View style={styles.group}>
                {notificationRows.map(({ key, label }, index) => (
                  <View key={key}>
                    {index ? <View style={styles.divider} /> : null}
                    <View style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>{label}</Text>
                      <Switch
                        value={!!prefs.notifications?.[key]}
                        onValueChange={(value) => setNotification(key, value)}
                        trackColor={{ false: T.elevated, true: T.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Nothing in here is a venue's decision to make. */}
            {isTenant ? null : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Απόρρητο</Text>

              <View style={styles.group}>
                {PRIVACY_ROWS.map(({ key, label }, index) => (
                  <View key={key}>
                    {index ? <View style={styles.divider} /> : null}
                    <View style={styles.toggleRow}>
                      <Text style={styles.toggleLabel}>{label}</Text>
                      <Switch
                        value={!!prefs.privacy?.[key]}
                        onValueChange={(value) => setPrivacy(key, value)}
                        trackColor={{ false: T.elevated, true: T.primary }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
            )}
          </>
        ) : null}

        {/* ---- account ---- */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Λογαριασμός</Text>

            {/* The hero and its pencil are guest-only now, so this is the only
                way a venue can still reach the edit sheet. */}
            {isTenant ? (
              <Pressable onPress={() => setEditing(true)}>
                <Text style={styles.sectionAction}>Επεξεργασία</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.group}>
            <Detail label="Όνομα χρήστη" value={user.username} />
            <View style={styles.divider} />
            <Detail label="Email" value={user.email} />
            {/* Account type was an internal discriminator on show — "tenant"
                and "user" mean nothing to either of them. */}
            {/* A business has no gender and no birthday. */}
            {!isTenant && user.gender ? (
              <>
                <View style={styles.divider} />
                <Detail label="Φύλο" value={user.gender} />
              </>
            ) : null}
            {!isTenant && user.dateOfBirth ? (
              <>
                <View style={styles.divider} />
                <Detail
                  label="Ημερομηνία γέννησης"
                  value={formatFullDate(user.dateOfBirth)}
                />
              </>
            ) : null}
            {user.createdAt ? (
              <>
                <View style={styles.divider} />
                <Detail label="Μέλος από" value={formatFullDate(user.createdAt)} />
              </>
            ) : null}
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]}
          onPress={confirmLogout}
        >
          <LogOut size={16} color={T.danger} strokeWidth={2.2} />
          <Text style={styles.logoutText}>Αποσύνδεση</Text>
        </Pressable>
      </ScrollView>

      <EditProfileModal
        visible={editing}
        user={user}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          refresh?.();
        }}
      />
    </SafeAreaView>
  );
}

function Detail({ label, value }) {
  const styles = useStyles(styleSheet);
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Stat({ value, label }) {
  const styles = useStyles(styleSheet);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LinkRow({ Icon, tone, label, onPress }) {
  const T = useTheme();
  const styles = useStyles(styleSheet);
  return (
    <Pressable
      style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}
      onPress={onPress}
    >
      <View style={[styles.linkIcon, { backgroundColor: `${tone}1F` }]}>
        <Icon size={16} color={tone} strokeWidth={2.3} />
      </View>
      <Text style={styles.linkLabel}>{label}</Text>
      <ChevronRight size={17} color={T.textFaint} strokeWidth={2.2} />
    </Pressable>
  );
}
