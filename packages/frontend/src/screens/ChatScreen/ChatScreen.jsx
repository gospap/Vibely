import { useCallback, useEffect, useRef, useState } from "react";
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
import { useNavigation, useRoute } from "@react-navigation/native";
import { ChevronLeft, ImagePlus, Send } from "lucide-react-native";

import Avatar from "@/components/Avatar";
import { messagesService } from "@/services/messages.service";
import { uploadsService } from "@/services/uploads.service";
import { formatClock, formatFullDate } from "@/utils/format";
import { T } from "@/styles/theme";
import styles from "./ChatScreen.styles";

const PAGE_SIZE = 30;
// No websockets here, so the thread polls while it is on screen.
const POLL_MS = 5000;

export default function ChatScreen() {
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

  const listRef = useRef(null);

  const fetchPage = useCallback(
    async (pageNumber) => {
      const data = await messagesService.thread(userId, {
        page: pageNumber,
        limit: PAGE_SIZE,
      });
      return data;
    },
    [userId],
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

        await messagesService.markRead(userId);
      } catch (err) {
        if (!cancelled) Alert.alert("Σφάλμα", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPage, userId]);

  /* --- poll the newest page for incoming messages --- */
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const data = await fetchPage(1);

        setMessages((prev) => {
          const known = new Set(prev.map((m) => m._id));
          const incoming = data.items.filter((m) => !known.has(m._id));
          if (!incoming.length) return prev;

          // Anything new from them is being looked at right now.
          if (incoming.some((m) => !m.mine)) {
            messagesService.markRead(userId).catch(() => {});
          }

          return [...incoming, ...prev];
        });
      } catch {
        // A dropped poll is not worth surfacing; the next one will catch up.
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [fetchPage, userId]);

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
      const sent = await messagesService.send(userId, { text, imageUrl });
      setMessages((prev) => [sent, ...prev]);
      setDraft("");
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

  const onPickPhoto = async () => {
    setUploading(true);
    try {
      const url = await uploadsService.pickAndUpload("chat");
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
          <Text style={styles.headerName} numberOfLines={1}>
            {username}
          </Text>
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
            onChangeText={setDraft}
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
