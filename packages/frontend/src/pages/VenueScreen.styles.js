import { StyleSheet } from "react-native";
import { T, TAB_BAR_SPACE } from "@/styles/theme";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  content: {
    padding: 16,
    paddingBottom: TAB_BAR_SPACE,
    gap: 14,
  },

  loader: {
    marginTop: 80,
  },

  /* ---- billing banner ---- */
  billing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 13,
    borderRadius: T.radius.md,
    borderWidth: 1,
  },

  billingLapsed: {
    backgroundColor: "rgba(248,113,113,0.12)",
    borderColor: "rgba(248,113,113,0.35)",
  },

  billingTrial: {
    backgroundColor: "rgba(251,191,36,0.12)",
    borderColor: "rgba(251,191,36,0.35)",
  },

  billingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  title: {
    flex: 1,
    color: T.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ---- which venue you are managing ---- */
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    height: 78,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },

  storeImage: {
    width: 78,
    height: 78,
    backgroundColor: T.elevated,
  },

  storeBody: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 12,
  },

  storeName: {
    color: T.text,
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  storeMeta: {
    color: T.textFaint,
    fontSize: 11.5,
  },

  storePlan: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },

  switcher: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: 8,
  },

  switchArrow: {
    width: 28,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.radius.sm,
    backgroundColor: T.surfaceAlt,
  },

  switchCount: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: "800",
    minWidth: 26,
    textAlign: "center",
  },

  /* ---- cards ---- */
  card: {
    gap: 10,
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
  },

  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  cardTitle: {
    color: T.text,
    fontSize: 13.5,
    fontWeight: "800",
  },

  cardHint: {
    color: T.textFaint,
    fontSize: 11.5,
    lineHeight: 16,
  },

  crowdRow: {
    flexDirection: "row",
    gap: 7,
  },

  crowd: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: T.radius.sm,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
  },

  crowdText: {
    color: T.textMuted,
    fontSize: 12.5,
    fontWeight: "700",
  },

  /* ---- tonight's offer ---- */
  offerLive: {
    gap: 4,
    padding: 12,
    borderRadius: T.radius.sm,
    backgroundColor: "rgba(74,222,128,0.12)",
  },

  offerLiveTitle: {
    color: T.text,
    fontSize: 15,
    fontWeight: "800",
  },

  offerLiveMeta: {
    color: T.accent,
    fontSize: 12,
    fontWeight: "700",
  },

  offerRow: {
    flexDirection: "row",
    gap: 8,
  },

  offerInput: {
    flex: 1,
    color: T.text,
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: T.surfaceAlt,
    borderRadius: T.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  offerInputFull: {
    color: T.text,
    fontSize: 14,
    backgroundColor: T.surfaceAlt,
    borderRadius: T.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },

  offerButton: {
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: T.radius.sm,
  },

  offerSend: {
    backgroundColor: T.primary,
  },

  offerCheck: {
    backgroundColor: T.elevated,
  },

  offerButtonText: {
    color: T.text,
    fontSize: 13.5,
    fontWeight: "700",
  },

  offerClear: {
    color: T.danger,
    fontSize: 12.5,
    fontWeight: "700",
  },

  /* ---- door code ---- */
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: T.radius.sm,
    backgroundColor: T.surfaceAlt,
  },

  code: {
    color: T.text,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: 8,
  },

  codeMeta: {
    alignItems: "flex-end",
  },

  codeCount: {
    color: T.accent,
    fontSize: 22,
    fontWeight: "800",
  },

  codeLabel: {
    color: T.textFaint,
    fontSize: 11,
  },

  /* ---- night switcher ---- */
  nightBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },

  nightArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  nightLabel: {
    alignItems: "center",
    gap: 2,
  },

  nightText: {
    color: T.text,
    fontSize: 17,
    fontWeight: "800",
  },

  nightToday: {
    color: T.primary,
    fontSize: 11.5,
    fontWeight: "700",
  },

  /* ---- covers ---- */
  covers: {
    gap: 8,
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
  },

  coversHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  coversText: {
    flex: 1,
    color: T.text,
    fontSize: 15,
    fontWeight: "800",
  },

  coversPending: {
    color: T.warning,
    fontSize: 12,
    fontWeight: "700",
  },

  coversTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: T.elevated,
    overflow: "hidden",
  },

  coversFill: {
    height: "100%",
    backgroundColor: T.primary,
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
    fontSize: 13,
    paddingVertical: 8,
  },

  /* ---- request rows ---- */
  request: {
    gap: 10,
    padding: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.24)",
  },

  confirmed: {
    padding: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    gap: 6,
  },

  requestHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  requestText: {
    flex: 1,
    gap: 3,
  },

  guest: {
    color: T.text,
    fontSize: 14.5,
    fontWeight: "700",
  },

  requestFacts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  factRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  fact: {
    color: T.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
  },

  table: {
    color: T.primary,
    fontSize: 12.5,
    fontWeight: "800",
  },

  phone: {
    color: T.textFaint,
    fontSize: 12,
  },

  note: {
    color: T.textMuted,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },

  doorTag: {
    color: T.accent,
    fontSize: 11.5,
    fontWeight: "800",
  },

  /* ---- accept / decline ---- */
  actions: {
    flexDirection: "row",
    gap: 8,
  },

  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: T.radius.sm,
  },

  accept: {
    backgroundColor: T.primary,
  },

  decline: {
    backgroundColor: "rgba(248,113,113,0.14)",
  },

  actionText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
});
