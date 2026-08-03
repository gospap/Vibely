import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { MessageCircle, UserPlus, Users, SearchX } from "lucide-react-native";

import Avatar from "@/components/Avatar";
import SearchField from "@/components/SearchField";
import UserRow from "@/components/UserRow";
import EmptyState from "@/components/EmptyState";
import { API_URL } from "@/constants/api";
import { toQuery } from "@/utils/query";
import { formatTimeAgo } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./CommunityScreen.styles";

const TABS = [
  { key: "chats", label: "Συνομιλίες", Icon: MessageCircle },
  { key: "requests", label: "Αιτήματα", Icon: UserPlus },
  { key: "friends", label: "Φίλοι", Icon: Users },
];

// Session cookie or the API treats every call as a stranger.
const call = async (path, method = "GET") => {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Σφάλμα ${res.status}`);
  return res.json();
};

export default function CommunityScreen() {
  const navigation = useNavigation();

  const [tab, setTab] = useState("chats");
  const [query, setQuery] = useState("");

  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);

  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const [convos, reqs, mates] = await Promise.all([
        call("/messages/conversations"),
        call("/users/me/requests"),
        call("/users/me/friends"),
      ]);
      setConversations(convos);
      setRequests(reqs);
      setFriends(mates);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Coming back from a chat should show the thread as read straight away.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /* --- debounced people search --- */
  const searchTimer = useRef(null);

  useEffect(() => {
    const term = query.trim();

    if (!term) {
      setResults([]);
      setSearching(false);
      clearTimeout(searchTimer.current);
      return;
    }

    setSearching(true);
    clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(async () => {
      try {
        const { items } = await call(
          `/users/search${toQuery({ q: term, limit: 30 })}`,
        );
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer.current);
  }, [query]);

  /* --- friend request actions ---
     Each one patches local state optimistically, then reloads the counts. */
  const withBusy = async (id, fn) => {
    setBusyId(id);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const setRelation = (id, relation) =>
    setResults((prev) =>
      prev.map((u) => (u._id === id ? { ...u, relation } : u)),
    );

  const onRowAction = (user) => {
    const { _id, relation } = user;

    if (relation === "friends") return openChat(user);

    if (relation === "none") {
      setRelation(_id, "requested");
      return withBusy(_id, () => call(`/users/${_id}/friend-request`, "POST"));
    }

    if (relation === "incoming") {
      setRelation(_id, "friends");
      return withBusy(_id, () =>
        call(`/users/${_id}/friend-request/accept`, "POST"),
      );
    }
  };

  const openChat = (user) =>
    navigation.navigate("Chat", {
      userId: user._id,
      username: user.username,
      profileImageUrl: user.profileImageUrl,
    });

  const openProfile = (user) =>
    navigation.navigate("UserProfile", { userId: user._id });

  /* --- rendering --- */
  const renderConversation = ({ item }) => {
    const { user, lastMessage, unread } = item;

    const preview = lastMessage
      ? `${lastMessage.mine ? "Εσύ: " : ""}${lastMessage.text || "Φωτογραφία"}`
      : "Ξεκίνα τη συζήτηση";

    return (
      <Pressable
        style={({ pressed }) => [styles.chatRow, pressed && { opacity: 0.7 }]}
        onPress={() => openChat(user)}
      >
        <Avatar
          uri={user.profileImageUrl}
          name={user.username}
          size={54}
          ring={unread > 0}
        />

        <View style={styles.chatText}>
          <Text style={styles.chatName} numberOfLines={1}>
            {user.username}
          </Text>
          <Text
            style={[styles.chatPreview, unread > 0 && styles.chatPreviewUnread]}
            numberOfLines={1}
          >
            {preview}
          </Text>
        </View>

        <View style={styles.chatMeta}>
          {lastMessage ? (
            <Text style={styles.chatTime}>
              {formatTimeAgo(lastMessage.createdAt)}
            </Text>
          ) : null}
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const listFor = () => {
    if (query.trim()) {
      return {
        data: results,
        keyExtractor: (item) => item._id,
        renderItem: ({ item }) => (
          <UserRow
            user={item}
            relation={item.relation}
            busy={busyId === item._id}
            onPress={() => openProfile(item)}
            onPrimary={() => onRowAction(item)}
          />
        ),
        empty: searching ? null : (
          <EmptyState
            icon={SearchX}
            title="Κανένα αποτέλεσμα"
            subtitle={`Δεν βρέθηκε χρήστης για «${query.trim()}»`}
          />
        ),
      };
    }

    if (tab === "requests") {
      return {
        data: requests,
        keyExtractor: (item) => item.user._id,
        renderItem: ({ item }) => (
          <UserRow
            user={item.user}
            relation="incoming"
            busy={busyId === item.user._id}
            subtitle={`Σου έστειλε αίτημα ${formatTimeAgo(item.createdAt)}`}
            primaryLabel="Αποδοχή"
            secondaryLabel="Απόρριψη"
            onPress={() => openProfile(item.user)}
            onPrimary={() =>
              withBusy(item.user._id, () =>
                call(`/users/${item.user._id}/friend-request/accept`, "POST"),
              )
            }
            onSecondary={() =>
              withBusy(item.user._id, () =>
                call(`/users/${item.user._id}/friend-request/reject`, "POST"),
              )
            }
          />
        ),
        empty: (
          <EmptyState
            icon={UserPlus}
            title="Κανένα αίτημα"
            subtitle="Τα αιτήματα φιλίας που δέχεσαι θα εμφανίζονται εδώ."
          />
        ),
      };
    }

    if (tab === "friends") {
      return {
        data: friends,
        keyExtractor: (item) => item._id,
        renderItem: ({ item }) => (
          <UserRow
            user={item}
            relation="friends"
            onPress={() => openProfile(item)}
            onPrimary={() => openChat(item)}
          />
        ),
        empty: (
          <EmptyState
            icon={Users}
            title="Δεν έχεις φίλους ακόμα"
            subtitle="Ψάξε κόσμο από την αναζήτηση και στείλε αίτημα."
          />
        ),
      };
    }

    return {
      data: conversations,
      keyExtractor: (item) => item.user._id,
      renderItem: renderConversation,
      empty: (
        <EmptyState
          icon={MessageCircle}
          title="Καμία συνομιλία"
          subtitle="Μόλις γίνετε φίλοι με κάποιον, θα μπορείτε να στέλνετε μηνύματα."
        />
      ),
    };
  };

  const list = listFor();
  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Κοινότητα</Text>

        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Αναζήτηση χρηστών"
        />
      </View>

      {!query.trim() ? (
        <View style={styles.tabs}>
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            const count =
              key === "requests"
                ? requests.length
                : key === "chats"
                  ? unreadTotal
                  : 0;

            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Icon
                  size={15}
                  color={active ? T.text : T.textFaint}
                  strokeWidth={2.2}
                />
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {label}
                </Text>
                {count > 0 ? (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color={T.primary} />
      ) : (
        <FlatList
          data={list.data}
          keyExtractor={list.keyExtractor}
          renderItem={list.renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            searching ? (
              <ActivityIndicator style={styles.loader} color={T.primary} />
            ) : (
              list.empty
            )
          }
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
        />
      )}
    </SafeAreaView>
  );
}
