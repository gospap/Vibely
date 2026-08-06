import { createContext, useContext, useMemo } from "react";
import { StyleSheet } from "react-native";

// Shape shared by both palettes. Every screen reads colours through one of
// these, so the only thing a theme changes is which object is in context.
const SHAPE = {
  radius: { sm: 10, md: 16, lg: 22, pill: 999 },
  space: (n) => n * 4,
};

// The original palette — the nightlife content (map pins at night, event cards,
// the glass tab bar) was designed against it.
export const DARK = {
  ...SHAPE,
  scheme: "dark",

  bg: "#0d0d0f",
  surface: "#171719",
  surfaceAlt: "#1f1f23",
  elevated: "#26262b",

  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",

  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.62)",
  textFaint: "rgba(255,255,255,0.38)",

  primary: "#4F7CFF",
  primarySoft: "rgba(79,124,255,0.16)",
  accent: "#4ade80",
  warning: "#fbbf24",
  danger: "#f87171",

  // The floating tab bar is frosted glass over whatever is behind it, so it
  // needs its own tokens rather than reusing surface/text.
  glassTint: "dark",
  glassBg: "rgba(10, 15, 28, 0.45)",
  glassBorder: "rgba(255,255,255,0.16)",
  glassPill: "rgba(255,255,255,0.16)",
  glassText: "rgba(255,255,255,0.62)",
  glassTextActive: "#ffffff",
  glassIcon: "rgba(255,255,255,0.4)",
};

// Daylight. The accents are darkened rather than reused: #4ade80 on white is
// roughly 1.6:1 and unreadable, where #15a34a clears AA for body text.
export const LIGHT = {
  ...SHAPE,
  scheme: "light",

  bg: "#f5f5f7",
  surface: "#ffffff",
  surfaceAlt: "#eeeef1",
  elevated: "#e3e3e8",

  border: "rgba(0,0,0,0.09)",
  borderStrong: "rgba(0,0,0,0.18)",

  text: "#111113",
  textMuted: "rgba(0,0,0,0.60)",
  textFaint: "rgba(0,0,0,0.42)",

  primary: "#3961e8",
  primarySoft: "rgba(57,97,232,0.12)",
  accent: "#15a34a",
  warning: "#b45309",
  danger: "#dc2626",

  glassTint: "light",
  glassBg: "rgba(255,255,255,0.62)",
  glassBorder: "rgba(0,0,0,0.10)",
  glassPill: "rgba(0,0,0,0.07)",
  glassText: "rgba(0,0,0,0.60)",
  glassTextActive: "#111113",
  glassIcon: "rgba(0,0,0,0.42)",
};

export const PALETTES = { dark: DARK, light: LIGHT };

export const ThemeContext = createContext({
  theme: DARK,
  scheme: "dark",
  setScheme: () => {},
});

/** The palette in force. Name it `T` at the call site and existing code reads unchanged. */
export const useTheme = () => useContext(ThemeContext).theme;

/** `{ scheme, setScheme }` — for the settings toggle. */
export const useThemeControls = () => useContext(ThemeContext);

/**
 * Turn a stylesheet into something that can be re-made per palette.
 *
 * Styles used to be built once at module load, which is why the app could only
 * ever be dark: the colour was copied into the style object before any user
 * preference had been read. The factory is memoised on the palette object, and
 * there are only ever two of those, so each sheet is built at most twice for
 * the life of the process.
 */
export function makeStyles(factory) {
  const cache = new Map();

  return (palette) => {
    let sheet = cache.get(palette);
    if (!sheet) {
      sheet = StyleSheet.create(factory(palette));
      cache.set(palette, sheet);
    }
    return sheet;
  };
}

/** Resolve a makeStyles() sheet against the active palette. */
export function useStyles(sheet) {
  const theme = useTheme();
  return useMemo(() => sheet(theme), [sheet, theme]);
}

export const SHADOW_CARD = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

// Bottom padding so content clears the floating glass tab bar.
export const TAB_BAR_SPACE = 110;
