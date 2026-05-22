import { Platform } from "react-native";

export const FONT_FAMILY = Platform.select({
  web: "Inter, system-ui, sans-serif",
  ios: "System",
  android: "sans-serif",
});

export const COLORS = {
  background: "#c2c2c2",

  surface: "#FFFFFF",
  primary: "#4F7CFF",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  overlay: "rgba(0,0,0,0.5)",
};

export const SHADOW = {
  shadowColor: "#000000",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};
