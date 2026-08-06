import { StyleSheet } from "react-native";
import { makeStyles, TAB_BAR_SPACE } from "@/styles/theme";

export default makeStyles((T) => ({
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
    alignItems: "center",
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_SPACE,
    gap: 22,
  },

  /* ---- the big button ---- */
  scan: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: T.radius.lg,
    backgroundColor: T.primary,
  },

  scanTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },

  scanHint: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13.5,
    textAlign: "center",
  },

  /* ---- sections ---- */
  section: {
    gap: 10,
  },

  sectionTitle: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  empty: {
    color: T.textFaint,
    fontSize: 13.5,
    lineHeight: 20,
  },

  /* ---- an earned coupon ---- */
  coupon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.accent,
  },

  couponImage: {
    width: 48,
    height: 48,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
  },

  couponText: {
    flex: 1,
    gap: 3,
  },

  couponReward: {
    color: T.text,
    fontSize: 16,
    fontWeight: "800",
  },

  couponVenue: {
    color: T.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  couponShow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: T.radius.sm,
    backgroundColor: T.accent,
  },

  couponShowText: {
    color: "#06210f",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
  },

  /* ---- a card being filled ---- */
  card: {
    gap: 12,
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },

  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  cardImage: {
    width: 40,
    height: 40,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
  },

  cardText: {
    flex: 1,
    gap: 2,
  },

  cardVenue: {
    color: T.text,
    fontSize: 15.5,
    fontWeight: "800",
  },

  cardReward: {
    color: T.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
  },

  dots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },

  dotFilled: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },

  cardRemaining: {
    color: T.text,
    fontSize: 14,
    fontWeight: "700",
  },

  /* ---- history ---- */
  spent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: T.radius.sm,
    backgroundColor: T.surface,
  },

  spentText: {
    flex: 1,
    color: T.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  spentWhen: {
    color: T.textFaint,
    fontSize: 11.5,
  },

  /* ---- the coupon QR ---- */
  qrBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },

  qrBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },

  qrCard: {
    width: 310,
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

  qrReward: {
    color: T.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 8,
  },

  qrPlate: {
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: "#fff",
  },

  qrCode: {
    color: T.accent,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 6,
    marginTop: 8,
  },

  qrHint: {
    color: T.textFaint,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },

  qrDone: {
    width: 200,
    height: 200,
    borderRadius: T.radius.md,
    backgroundColor: "rgba(74,222,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  qrDoneText: {
    color: T.accent,
    fontSize: 21,
    fontWeight: "900",
    marginTop: 8,
  },
}));
