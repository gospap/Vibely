import { Platform } from "react-native";
import Constants from "expo-constants";

// Set by scripts/tunnel.js. When the phone reaches the dev server through a
// Cloudflare tunnel there is no LAN address to derive anything from, so the
// API URL has to be handed in rather than guessed.
const TUNNELLED_API = process.env.EXPO_PUBLIC_API_URL;

// Take the dev machine's address from the Metro bundler URI instead of hardcoding
// it, so the app follows whatever network Expo is serving on (WiFi, hotspot,
// Tailscale) without needing an edit here every time the IP changes.
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];

// No bundler (production build): the Android emulator reaches the host machine
// through 10.0.2.2, everything else through localhost.
const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const API_URL =
  TUNNELLED_API || `http://${devHost ?? fallbackHost}:3000`;

export const API_BASE_URL = `${API_URL}/api`;
