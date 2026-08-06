import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";

import { API_URL } from "@/constants/api";
import { navigate } from "@/navigation/rootNavigation";
import {
  canReceiveRemotePush,
  ensurePermission,
  registerPushToken,
  setUpChannels,
} from "@/utils/push";
import { AuthContext } from "./AuthContext";
import { SocketContext } from "./SocketContext";

export const MessagesContext = createContext({
  unread: 0,
  setActiveThread: () => {},
  refreshUnread: () => {},
});

// Set once, at module scope: the handler decides what a notification does while
// the app is *open*, and registering it inside a component would rebind it on
// every render.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Delivery for the whole app rather than for the open thread.
 *
 * ChatScreen used to be the only thing listening for `message:new`, so a
 * message that arrived while you were anywhere else — the map, another chat,
 * the home screen — did nothing at all until you happened to open that thread.
 * This listens once, at the root, for as long as there is a session.
 */
export function MessagesProvider({ children }) {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);

  const [unread, setUnread] = useState(0);

  // A ref, not state: the socket handler reads it, and re-subscribing every
  // time the open thread changes would drop events in the gap.
  const activeThread = useRef(null);

  const refreshUnread = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch(`${API_URL}/messages/unread-count`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const { count } = await res.json();
      setUnread(count);
      // Keep the icon badge honest even when the count went *down* — nothing
      // else ever clears it.
      Notifications.setBadgeCountAsync(count).catch(() => {});
    } catch {
      // The badge is not worth an error state; the next refresh corrects it.
    }
  }, [user]);

  const setActiveThread = useCallback((userId) => {
    activeThread.current = userId ? String(userId) : null;
  }, []);

  /* --- notification permission + this device's push token --- */
  useEffect(() => {
    if (!user) return;

    (async () => {
      await setUpChannels();
      const granted = await ensurePermission();
      if (granted) await registerPushToken();
    })();
  }, [user?.id]);

  /* --- the count the tab badge shows --- */
  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  /* --- every incoming message, on every screen --- */
  useEffect(() => {
    if (!socket) return undefined;

    const onNew = async (message) => {
      const from = String(message.sender);

      // The open thread renders it itself and marks it read in the same breath,
      // so counting it here would show a badge for a message being read.
      if (activeThread.current === from) return;

      refreshUnread();

      // With a working push token the server's own notification is already on
      // its way and the OS will show it — a second one here would double up.
      // Without one (Expo Go, denied permission) this is the only feedback the
      // user gets, so it is worth posting locally.
      if (canReceiveRemotePush()) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.senderName || "Νέο μήνυμα",
          body: message.text || "📷 Φωτογραφία",
          data: {
            type: "message",
            userId: from,
            username: message.senderName ?? "",
            profileImageUrl: message.senderImageUrl ?? null,
          },
        },
        trigger: null,
      }).catch(() => {});
    };

    socket.on("message:new", onNew);
    return () => socket.off("message:new", onNew);
  }, [socket, refreshUnread]);

  /* --- tapping a notification opens the thread it came from --- */
  useEffect(() => {
    const open = (response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.type !== "message" || !data.userId) return;

      navigate("Chat", {
        userId: data.userId,
        username: data.username ?? "",
        profileImageUrl: data.profileImageUrl ?? null,
      });
    };

    // A notification tapped while the app was killed is what launched it, and
    // it is only available through this one call — the listener below never
    // fires for it.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => response && open(response))
      .catch(() => {});

    const subscription =
      Notifications.addNotificationResponseReceivedListener(open);

    return () => subscription.remove();
  }, []);

  /* --- coming back from the background --- */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;

      // The OS suspends JS in the background, which takes the socket with it.
      // socket.io reconnects on its own, but only once it notices; asking
      // directly makes the app usable the moment it is on screen again.
      if (socket && !socket.connected) socket.connect();
      refreshUnread();
    });

    return () => subscription.remove();
  }, [socket, refreshUnread]);

  return (
    <MessagesContext.Provider
      value={{ unread, setActiveThread, refreshUnread }}
    >
      {children}
    </MessagesContext.Provider>
  );
}
