import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { API_URL } from "@/constants/api";

// The token this install is currently registered under. Kept in a module rather
// than in state because logout has to unregister it, and by the time the user
// object clears there is no session cookie left to do it with.
let currentToken = null;

export const getPushToken = () => currentToken;

// Whether a *remote* push can reach this device. When it cannot — Expo Go, a
// simulator, a refused permission — the app falls back to showing its own
// notification off the socket, so it has to know which world it is in.
export const canReceiveRemotePush = () => currentToken != null;

// Remote push needs a dev build: Expo Go dropped it on Android in SDK 53 and it
// has never worked on an iOS simulator. Detected rather than assumed, so the
// same code runs in both and only the fallback differs.
const REMOTE_PUSH_SUPPORTED =
  Device.isDevice &&
  Constants.executionEnvironment !== "storeClient";

const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

// Android groups notifications by channel and takes importance from it, not
// from the message — a channel created with default importance can never buzz,
// even for a message. Created before any notification is shown.
export async function setUpChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "Vibely",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#4F7CFF",
  });

  await Notifications.setNotificationChannelAsync("messages", {
    name: "Μηνύματα",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 120, 220],
    lightColor: "#4F7CFF",
  });
}

// Returns true when the OS will let us post notifications at all — local ones
// included, which is what Expo Go is limited to.
export async function ensurePermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  // Asking again after a refusal is a no-op on both platforms, so this does not
  // nag; it only covers the first launch and a permission granted in Settings.
  if (!existing.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Hand this device's push token to the API. Safe to call on every launch — the
 * OS can rotate a token whenever it likes and the app is the only thing that
 * ever hears about it, so re-registering is the only way to stay reachable.
 */
export async function registerPushToken() {
  if (!REMOTE_PUSH_SUPPORTED) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await fetch(`${API_URL}/users/me/push-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    currentToken = token;
    return token;
  } catch (err) {
    // Almost always a missing EAS projectId or a build without notification
    // entitlements. Not fatal: the socket still delivers while the app is open.
    console.log("Push registration skipped:", err.message);
    return null;
  }
}

// Called *before* the logout request, while the cookie is still good. Only this
// device is dropped, so the same account stays reachable on the user's tablet.
export async function unregisterPushToken() {
  if (!currentToken) return;

  const token = currentToken;
  currentToken = null;

  try {
    await fetch(`${API_URL}/users/me/push-token`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
    // The server prunes tokens the moment Expo reports them dead, so a failed
    // unregister costs at most one notification to a logged-out device.
  }
}
