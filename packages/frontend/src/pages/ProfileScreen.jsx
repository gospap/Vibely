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
import { Pencil, LogOut, CalendarDays, Users } from "lucide-react-native";

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
];

export default function ProfileScreen() {
  const { user, logout, refresh } = useContext(AuthContext);
  const navigation = useNavigation();

  const [prefs, setPrefs] = useState(null);
  const [myEvents, setMyEvents] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [preferences, events, mates] = await Promise.all([
        call("/users/me/preferences"),
        call("/users/me/events"),
        call("/users/me/friends"),
      ]);
      setPrefs(preferences);
      setMyEvents(events);
      setFriends(mates);
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
        <View style={styles.header}>
          <Avatar uri={avatarUri} name={user.username} size={96} />

          <View style={styles.headerText}>
            <Text style={styles.name}>{user.username || "Χρήστης"}</Text>
            <Text style={styles.email}>{user.email}</Text>
            {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>

          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.7 }]}
            onPress={() => setEditing(true)}
          >
            <Pencil size={14} color={T.text} strokeWidth={2.2} />
            <Text style={styles.editButtonText}>Επεξεργασία προφίλ</Text>
          </Pressable>
        </View>

        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{myEvents.length}</Text>
            <Text style={styles.cardLabel}>Events</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{friends.length}</Text>
            <Text style={styles.cardLabel}>Φίλοι</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>
              {user.savedStores?.length ?? 0}
            </Text>
            <Text style={styles.cardLabel}>Αποθηκευμένα</Text>
          </View>
        </View>

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

        {/* ---- preferences ---- */}
        {prefs ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ειδοποιήσεις</Text>

              {NOTIFICATION_ROWS.map(({ key, label }) => (
                <View key={key} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{label}</Text>
                  <Switch
                    value={!!prefs.notifications?.[key]}
                    onValueChange={(value) => setNotification(key, value)}
                    trackColor={{ false: T.elevated, true: T.primary }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Απόρρητο</Text>

              {PRIVACY_ROWS.map(({ key, label }) => (
                <View key={key} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{label}</Text>
                  <Switch
                    value={!!prefs.privacy?.[key]}
                    onValueChange={(value) => setPrivacy(key, value)}
                    trackColor={{ false: T.elevated, true: T.primary }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ---- account ---- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Λογαριασμός</Text>

          <Detail label="Όνομα χρήστη" value={user.username} />
          <Detail label="Email" value={user.email} />
          <Detail label="Τύπος" value={user.type || "user"} />
          {user.gender ? <Detail label="Φύλο" value={user.gender} /> : null}
          {user.dateOfBirth ? (
            <Detail
              label="Ημερομηνία γέννησης"
              value={formatFullDate(user.dateOfBirth)}
            />
          ) : null}
          {user.createdAt ? (
            <Detail label="Μέλος από" value={formatFullDate(user.createdAt)} />
          ) : null}
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
