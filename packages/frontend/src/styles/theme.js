// Dark tokens for the screens built on top of the original layout. The nightlife
// content (map pins at night, event cards, the glass tab bar) was already dark,
// so everything new sits on the same palette.
export const T = {
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

  radius: { sm: 10, md: 16, lg: 22, pill: 999 },
  space: (n) => n * 4,
};

export const SHADOW_CARD = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

// Bottom padding so content clears the floating glass tab bar.
export const TAB_BAR_SPACE = 110;
