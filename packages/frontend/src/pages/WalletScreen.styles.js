import { StyleSheet } from "react-native";
import { T, TAB_BAR_SPACE } from "@/styles/theme";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  back: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: T.text,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  loader: {
    marginTop: 60,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_SPACE,
    gap: 10,
  },

  /* ---- rows ---- */
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.28)",
  },

  rowSpent: {
    borderColor: "transparent",
    opacity: 0.55,
  },

  image: {
    width: 52,
    height: 52,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
  },

  rowBody: {
    flex: 1,
    gap: 3,
  },

  title: {
    color: T.text,
    fontSize: 14.5,
    fontWeight: "800",
    lineHeight: 19,
  },

  venue: {
    color: T.textMuted,
    fontSize: 12.5,
    fontWeight: "700",
  },

  tapHint: {
    color: T.accent,
    fontSize: 11.5,
    fontWeight: "700",
  },

  spent: {
    color: T.textFaint,
    fontSize: 11.5,
  },

  code: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: T.radius.sm,
    backgroundColor: "rgba(74,222,128,0.14)",
  },

  codeSpent: {
    backgroundColor: T.surfaceAlt,
  },

  codeText: {
    color: T.accent,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  codeTextSpent: {
    color: T.textFaint,
  },

  /* ---- QR ---- */
  qrBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },

  qrBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },

  qrCard: {
    width: 300,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 26,
    borderRadius: T.radius.lg,
    backgroundColor: T.surface,
  },

  qrClose: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  qrVenue: {
    color: T.textMuted,
    fontSize: 12.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  qrTitle: {
    color: T.text,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 6,
  },

  qrPlate: {
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: "#fff",
  },

  qrCode: {
    color: T.accent,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 8,
    marginTop: 8,
  },

  qrHint: {
    color: T.textFaint,
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 16,
  },
});
