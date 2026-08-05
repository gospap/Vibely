import { Platform } from "react-native";
import Constants from "expo-constants";

// Set explicitly for anything that is not "my laptop on this WiFi" — a release
// build pointing at the deployed API, or a device that cannot reach the LAN.
// Everything below is dev-machine guesswork and has nothing to fall back on in
// production, so an explicit value always wins.
const EXPLICIT_API = process.env.EXPO_PUBLIC_API_URL;

// Take the dev machine's address from the Metro bundler URI instead of hardcoding
// it, so the app follows whatever network Expo is serving on (WiFi, hotspot,
// Tailscale) without needing an edit here every time the IP changes.
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];

// No bundler (production build): the Android emulator reaches the host machine
// through 10.0.2.2, everything else through localhost.
const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const API_URL =
  EXPLICIT_API || `http://${devHost ?? fallbackHost}:3000`;

export const API_BASE_URL = `${API_URL}/api`;
