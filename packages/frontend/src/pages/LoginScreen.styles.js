import { StyleSheet } from "react-native";
import { T, SHADOW_CARD } from "@/styles/theme";

// Shared by Login and SignUp — the two screens are the same form with a
// different number of fields, so they should not drift apart visually.
export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // A soft blue bloom behind the logo. There is no gradient library in the
  // project, so it is two oversized translucent circles bleeding off the top
  // edge — cheap, and enough to stop the dark background reading as flat.
  glowTop: {
    position: "absolute",
    top: -190,
    alignSelf: "center",
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(79,124,255,0.20)",
  },

  glowSide: {
    position: "absolute",
    top: -70,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(74,222,128,0.10)",
  },

  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingVertical: 48,
  },

  header: {
    alignItems: "center",
    marginBottom: 32,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: T.text,
    marginTop: 22,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: T.textMuted,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 21,
  },

  form: {
    gap: 12,
  },

  /* ---- inputs ---- */
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },

  // Focus is worth showing properly: on a dark form the caret alone is easy
  // to lose track of.
  fieldFocused: {
    borderColor: T.primary,
    backgroundColor: T.surfaceAlt,
  },

  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: T.text,
    // Kills the default vertical padding that makes Android inputs sit high.
    paddingVertical: 0,
  },

  /* ---- primary action ---- */
  button: {
    height: 54,
    borderRadius: T.radius.md,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    ...SHADOW_CARD,
    shadowColor: T.primary,
    shadowOpacity: 0.4,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  /* ---- footer link ---- */
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 26,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.border,
  },

  dividerText: {
    fontSize: 12,
    fontWeight: "600",
    color: T.textFaint,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  footerText: {
    fontSize: 14,
    fontWeight: "500",
    color: T.textMuted,
  },

  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: T.primary,
  },
});
