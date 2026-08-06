import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import ChevronLeft from "lucide-react-native/dist/esm/icons/chevron-left";
import ImagePlus from "lucide-react-native/dist/esm/icons/image-plus";
import Send from "lucide-react-native/dist/esm/icons/send";

import Avatar from "@/components/Avatar";
import { SocketContext } from "@/context/SocketContext";
import { MessagesContext } from "@/context/MessagesContext";
import { API_URL } from "@/constants/api";
import { toQuery } from "@/utils/query";
import { pickAndUpload } from "@/utils/upload";
import { formatClock, formatFullDate } from "@/utils/format";
import { useStyles, useTheme } from "@/styles/theme";
import styleSheet from "./ChatScreen.styles";

const PAGE_SIZE = 30;
// Fallback only: the socket delivers messages the moment they are written, and
// this poll runs solely while that connection is down.
const POLL_MS = 5000;
// A typing bubble that never clears is worse than none, so it expires on a
// timer as well as on the "stopped" event.
const TYPING_TIMEOUT_MS = 4000;

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

export default function ChatScreen() {
  const T = useTheme();
  const styles = useStyles(styleSheet);

  const navigation = useNavigation();
  const { userId, username, profileImageUrl } = useRoute().params;

  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const socket = useContext(SocketContext);
  const { setActiveThread, refreshUnread } = useContext(MessagesContext);
  const [connected, setConnected] = useState(false);
  const [theyAreTyping, setTheyAreTyping] = useState(false);

  const listRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);

  const fetchPage = useCallback(
    async (pageNumber) =>
      call(
        `/messages/${userId}${toQuery({ page: pageNumber, limit: PAGE_SIZE })}`,
      ),
    [userId],
  );

  // Tells the app-level listener not to badge or notify for this thread — it is
  // on screen, and anything that lands here is read the moment it arrives.
  useFocusEffect(
    useCallback(() => {
      setActiveThread(userId);
      return () => setActiveThread(null);
    }, [setActiveThread, userId]),
  );

  // Merge a page into what is already on screen without disturbing the order or
  // re-adding anything. Used by both the reconnect catch-up and the poll.
  const mergeIncoming = useCallback(
    (items) => {
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m._id));
        const incoming = items.filter((m) => !known.has(m._id));
        if (!incoming.length) return prev;

        if (incoming.some((m) => !m.mine)) {
          call(`/messages/${userId}/read`, { method: "POST" })
            .then(refreshUnread)
            .catch(() => {});
        }

        return [...incoming, ...prev];
      });
    },
    [refreshUnread, userId],
  );

  /* --- first load + mark the thread as read --- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchPage(1);
        if (cancelled) return;

        setMessages(data.items);
        setHasMore(data.hasMore);
        setPage(1);

        await call(`/messages/${userId}/read`, { method: "POST" });
        refreshUnread();
      } catch (err) {
        if (!cancelled) Alert.alert("Σφάλμα", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPage, refreshUnread, userId]);

  /* --- live delivery over the socket --- */
  useEffect(() => {
    if (!socket) {
      setConnected(false);
      return;
    }

    setConnected(socket.connected);

    const onConnect = () => {
      setConnected(true);

      // Nothing was pushed while the socket was down — a backgrounded app can
      // miss an entire conversation that way — so the thread is caught up the
      // moment it is back rather than waiting for the next message to arrive.
      fetchPage(1)
        .then((data) => mergeIncoming(data.items))
        .catch(() => {});
    };

    const onDisconnect = () => setConnected(false);

    const onNew = (message) => {
      // Messages from other threads belong to the conversation list, not here.
      if (String(message.sender) !== String(userId)) return;

      setMessages((prev) =>
        prev.some((m) => m._id === message._id) ? prev : [message, ...prev],
      );

      // It arrived while the thread was open, so it has been seen.
      call(`/messages/${userId}/read`, { method: "POST" })
        .then(refreshUnread)
        .catch(() => {});
    };

    const onRead = ({ by }) => {
      if (String(by) !== String(userId)) return;
      setMessages((prev) =>
        prev.map((m) => (m.mine && !m.read ? { ...m, read: true } : m)),
      );
    };

    const onTyping = ({ from, typing }) => {
      if (String(from) !== String(userId)) return;

      setTheyAreTyping(typing);
      clearTimeout(typingTimer.current);

      if (typing) {
        typingTimer.current = setTimeout(
          () => setTheyAreTyping(false),
          TYPING_TIMEOUT_MS,
        );
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onNew);
    socket.on("message:read", onRead);
    socket.on("typing", onTyping);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onNew);
      socket.off("message:read", onRead);
      socket.off("typing", onTyping);
      clearTimeout(typingTimer.current);
    };
  }, [socket, userId, fetchPage, mergeIncoming, refreshUnread]);

  /* --- fallback poll, only while the socket is down --- */
  useEffect(() => {
    if (connected) return undefined;

    const timer = setInterval(async () => {
      try {
        const data = await fetchPage(1);
        mergeIncoming(data.items);
      } catch {
        // A dropped poll is not worth surfacing; the next one will catch up.
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [connected, fetchPage, mergeIncoming]);

  const loadOlder = async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await fetchPage(next);

      setMessages((prev) => {
        const known = new Set(prev.map((m) => m._id));
        return [...prev, ...data.items.filter((m) => !known.has(m._id))];
      });
      setHasMore(data.hasMore);
      setPage(next);
    } catch {
      // Keep what is already on screen.
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async ({ text, imageUrl }) => {
    setSending(true);
    try {
      const sent = await call(`/messages/${userId}`, {
        method: "POST",
        body: { text, imageUrl },
      });
      setMessages((prev) => [sent, ...prev]);
      setDraft("");
      socket?.emit("typing", { to: userId, typing: false });
      lastTypingSent.current = 0;
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (err) {
      Alert.alert("Δεν στάλθηκε", err.message);
    } finally {
      setSending(false);
    }
  };

  const onSend = () => {
    const text = draft.trim();
    if (!text || sending) return;
    send({ text });
  };

  // Fires on every keystroke, so it is throttled to one ping every couple of
  // seconds; the other side's bubble expires on its own timer anyway.
  const onDraftChange = (value) => {
    setDraft(value);

    const now = Date.now();
    if (socket && value && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      socket.emit("typing", { to: userId, typing: true });
    }
  };

  const onPickPhoto = async () => {
    setUploading(true);
    try {
      const url = await pickAndUpload("chat");
      if (url) await send({ imageUrl: url });
    } catch (err) {
      Alert.alert("Σφάλμα", err.message);
    } finally {
      setUploading(false);
    }
  };

  /* --- rendering ---
     The list is inverted, so "the message before this one" is the next index. */
  const renderItem = ({ item, index }) => {
    const previous = messages[index + 1];
    const showDay =
      !previous ||
      new Date(previous.createdAt).toDateString() !==
        new Date(item.createdAt).toDateString();

    return (
      <View>
        {showDay ? (
          <Text style={styles.dayDivider}>{formatFullDate(item.createdAt)}</Text>
        ) : null}

        <View
          style={[
            styles.bubbleRow,
            item.mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
          ]}
        >
          <View
            style={[
              styles.bubble,
              item.mine ? styles.bubbleMine : styles.bubbleTheirs,
              item.imageUrl && styles.bubblePhoto,
            ]}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.photo} />
            ) : null}

            {item.text ? (
              <Text style={[styles.text, item.mine && styles.textMine]}>
                {item.text}
              </Text>
            ) : null}

            <Text style={[styles.time, item.mine && styles.timeMine]}>
              {formatClock(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <ChevronLeft size={26} color={T.text} strokeWidth={2.2} />
        </Pressable>

        <Pressable
          style={styles.headerUser}
          onPress={() => navigation.navigate("UserProfile", { userId })}
        >
          <Avatar uri={profileImageUrl} name={username} size={36} />

          <View style={styles.headerText}>
            <Text style={styles.headerName} numberOfLines={1}>
              {username}
            </Text>
            {theyAreTyping ? (
              <Text style={styles.headerTyping}>γράφει…</Text>
            ) : null}
          </View>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {loading ? (
          <ActivityIndicator style={styles.loader} color={T.primary} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={styles.listContent}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.4}
            keyboardDismissMode="interactive"
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={styles.moreLoader} color={T.textFaint} />
              ) : null
            }
            ListEmptyComponent={
              <Text style={styles.emptyThread}>
                Πες ένα γεια στον/στην {username}.
              </Text>
            }
          />
        )}

        <View style={styles.composer}>
          <Pressable
            onPress={onPickPhoto}
            disabled={uploading || sending}
            hitSlop={8}
            style={styles.composerIcon}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={T.textMuted} />
            ) : (
              <ImagePlus size={22} color={T.textMuted} strokeWidth={2} />
            )}
          </Pressable>

          <TextInput
            value={draft}
            onChangeText={onDraftChange}
            placeholder="Μήνυμα..."
            placeholderTextColor={T.textFaint}
            style={styles.input}
            multiline
            maxLength={2000}
          />

          <Pressable
            onPress={onSend}
            disabled={!draft.trim() || sending}
            hitSlop={8}
            style={[
              styles.sendButton,
              (!draft.trim() || sending) && styles.sendButtonOff,
            ]}
          >
            <Send size={18} color="#fff" strokeWidth={2.2} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
