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
import {
  Pencil,
  LogOut,
  CalendarDays,
  Users,
  CalendarCheck,
  Gift,
  ChevronRight,
  Ticket,
  CreditCard,
  Store as StoreIcon,
  ChartNoAxesColumn,
} from "lucide-react-native";

import { AuthContext } from "@/context/AuthContext";
import Avatar from "@/components/Avatar";
import TriangleLoader from "@/components/TriangleLoader";
import EditProfileModal from "./EditProfileModal";
import { API_URL } from "@/constants/api";
import { formatEventDate, formatFullDate } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./ProfileScreen.styles";

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
const NOTIFICATION_ROWS = [
  { key: "push", label: "Push ειδοποιήσεις" },
  { key: "messages", label: "Νέα μηνύματα" },
  { key: "friendRequests", label: "Αιτήματα φιλίας" },
  { key: "eventReminders", label: "Υπενθυμίσεις για events" },
  { key: "email", label: "Email ενημερώσεις" },
];

const PRIVACY_ROWS = [
  { key: "discoverable", label: "Να με βρίσκουν στην αναζήτηση" },
  { key: "showAttendance", label: "Να φαίνεται σε ποια events πάω" },
  { key: "showCheckIns", label: "Να φαίνεται στους φίλους πού κάνω check-in" },
];

export default function ProfileScreen() {
  const { user, logout, refresh } = useContext(AuthContext);
  const navigation = useNavigation();

  const [prefs, setPrefs] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loyalty, setLoyalty] = useState([]);
  const [venues, setVenues] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);

  // A venue account is running a business here, not going out. Stamp cards,
  // friends and "events I'm attending" mean nothing to it, so it gets its own
  // numbers and its own tools rather than a guest screen with extras bolted on.
  const isTenant = user?.type === "tenant";

  const load = useCallback(async () => {
    try {
      if (isTenant) {
        const [preferences, mine] = await Promise.all([
          call("/users/me/preferences"),
          call("/stores/mine"),
        ]);

        setPrefs(preferences);
        setVenues(mine);

        // One summary per venue, then summed. A tenant has a handful of bars,
        // so this is a few small requests rather than a new endpoint.
        const summaries = await Promise.all(
          mine.map((venue) =>
            call(`/reservations/store/${venue._id}/summary`).catch(() => []),
          ),
        );
        setPendingCount(
          summaries
            .flat()
            .reduce((sum, night) => sum + (night.pending ?? 0), 0),
        );
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
        {/* ---- hero ---- */}
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

          {/* One strip with hairline dividers rather than three floating tiles.
              A venue's numbers are its own, not a nightlife-goer's. */}
          <View style={styles.stats}>
            {isTenant ? (
              <>
                <Stat value={venues.length} label="Μαγαζιά" />
                <View style={styles.statDivider} />
                <Stat value={pendingCount} label="Σε αναμονή" />
                <View style={styles.statDivider} />
                <Stat
                  value={venues.filter((v) => v.subscription?.entitled).length}
                  label="Ενεργά"
                />
              </>
            ) : (
              <>
                <Stat value={myEvents.length} label="Events" />
                <View style={styles.statDivider} />
                <Stat value={friends.length} label="Φίλοι" />
                <View style={styles.statDivider} />
                <Stat
                  value={user.savedStores?.length ?? 0}
                  label="Αποθηκευμένα"
                />
              </>
            )}
          </View>
        </View>

        {/* ---- the tools for this kind of account ---- */}
        {isTenant ? (
          <View style={styles.group}>
            <LinkRow
              Icon={StoreIcon}
              tone={T.primary}
              label="Το μαγαζί μου"
              onPress={() => navigation.navigate("Venue")}
            />
            <View style={styles.divider} />
            <LinkRow
              Icon={ChartNoAxesColumn}
              tone={T.accent}
              label="Στατιστικά"
              onPress={() => navigation.navigate("VenueAnalytics")}
            />
            <View style={styles.divider} />
            <LinkRow
              Icon={CreditCard}
              tone={T.warning}
              label="Συνδρομή & χρεώσεις"
              onPress={() => navigation.navigate("Billing")}
            />
          </View>
        ) : (
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

        {/* ---- preferences ---- */}
        {prefs ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ειδοποιήσεις</Text>

              <View style={styles.group}>
                {NOTIFICATION_ROWS.map(({ key, label }, index) => (
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
          </>
        ) : null}

        {/* ---- account ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Λογαριασμός</Text>

          <View style={styles.group}>
            <Detail label="Όνομα χρήστη" value={user.username} />
            <View style={styles.divider} />
            <Detail label="Email" value={user.email} />
            <View style={styles.divider} />
            <Detail label="Τύπος" value={user.type || "user"} />
            {user.gender ? (
              <>
                <View style={styles.divider} />
                <Detail label="Φύλο" value={user.gender} />
              </>
            ) : null}
            {user.dateOfBirth ? (
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
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function LinkRow({ Icon, tone, label, onPress }) {
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
