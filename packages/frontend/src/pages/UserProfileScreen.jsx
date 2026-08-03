import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ChevronLeft, MessageCircle, UserPlus, UserMinus, Clock } from "lucide-react-native";

import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import { API_URL } from "@/constants/api";
import { formatFullDate } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./UserProfileScreen.styles";

// Session cookie or the API treats every call as a stranger.
const call = async (path, method = "GET") => {
  const res = await fetch(`${API_URL}${path}`, { method, credentials: "include" });
  if (!res.ok) throw new Error(`Σφάλμα ${res.status}`);
  return res.json();
};

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const { userId } = useRoute().params;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    call(`/users/${userId}`)
      .then((data) => !cancelled && setUser(data))
      .catch((err) => !cancelled && Alert.alert("Σφάλμα", err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const act = async (fn, nextRelation) => {
    setBusy(true);
    try {
      await fn();
      setUser((prev) => ({ ...prev, relation: nextRelation }));
    } catch (err) {
      Alert.alert("Σφάλμα", err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmUnfriend = () =>
    Alert.alert("Διαγραφή φίλου", `Να αφαιρεθεί ο/η ${user.username};`, [
      { text: "Άκυρο", style: "cancel" },
      {
        text: "Διαγραφή",
        style: "destructive",
        onPress: () =>
          act(() => call(`/users/${userId}/friend`, "DELETE"), "none"),
      },
    ]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loader} color={T.primary} />
      </SafeAreaView>
    );
  }

  if (!user) return null;

  // One action per relation state, so the button always says what happens next.
  const action = {
    none: {
      label: "Αίτημα φιλίας",
      icon: UserPlus,
      variant: "primary",
      onPress: () =>
        act(
          () => call(`/users/${userId}/friend-request`, "POST"),
          "requested",
        ),
    },
    requested: {
      label: "Ακύρωση αιτήματος",
      icon: Clock,
      variant: "secondary",
      onPress: () =>
        act(() => call(`/users/${userId}/friend-request`, "DELETE"), "none"),
    },
    incoming: {
      label: "Αποδοχή αιτήματος",
      icon: UserPlus,
      variant: "primary",
      onPress: () =>
        act(
          () => call(`/users/${userId}/friend-request/accept`, "POST"),
          "friends",
        ),
    },
    friends: {
      label: "Μήνυμα",
      icon: MessageCircle,
      variant: "primary",
      onPress: () =>
        navigation.navigate("Chat", {
          userId,
          username: user.username,
          profileImageUrl: user.profileImageUrl,
        }),
    },
  }[user.relation];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <ChevronLeft size={26} color={T.text} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>{user.username}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Avatar uri={user.profileImageUrl} name={user.username} size={96} />
          <Text style={styles.name}>{user.username}</Text>
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>

        {action ? (
          <View style={styles.actions}>
            <Button
              label={action.label}
              icon={action.icon}
              variant={action.variant}
              loading={busy}
              onPress={action.onPress}
              style={styles.actionButton}
            />

            {user.relation === "friends" ? (
              <Button
                label="Διαγραφή"
                icon={UserMinus}
                variant="danger"
                onPress={confirmUnfriend}
              />
            ) : null}
          </View>
        ) : null}

        {user.favouriteGenres?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Μουσική που ακούει</Text>
            <View style={styles.genres}>
              {user.favouriteGenres.map((genre) => (
                <View key={genre} style={styles.genre}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {user.createdAt ? (
          <Text style={styles.member}>
            Μέλος από {formatFullDate(user.createdAt)}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
