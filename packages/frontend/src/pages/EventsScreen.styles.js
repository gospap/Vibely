import { StyleSheet } from "react-native";
import { T, TAB_BAR_SPACE, SHADOW_CARD } from "@/styles/theme";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },

  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.5,
  },

  count: {
    color: T.textFaint,
    fontSize: 12.5,
    fontWeight: "600",
  },

  chipsRow: {
    flexGrow: 0,
    marginBottom: 12,
  },

  chips: {
    paddingHorizontal: 16,
    gap: 8,
  },

  /* ---- promoted (paid placement) ---- */
  promotedRow: {
    flexGrow: 0,
    marginBottom: 14,
  },

  promoted: {
    paddingHorizontal: 16,
    gap: 10,
  },

  promotedCard: {
    width: 216,
    gap: 4,
    paddingBottom: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.45)",
    overflow: "hidden",
  },

  promotedImage: {
    width: "100%",
    height: 96,
    backgroundColor: T.elevated,
  },

  promotedTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    marginHorizontal: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.radius.pill,
    backgroundColor: T.warning,
  },

  promotedTagText: {
    color: "#1a1400",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    maxWidth: 150,
  },

  promotedTitle: {
    color: T.text,
    fontSize: 14.5,
    fontWeight: "800",
    lineHeight: 19,
    marginHorizontal: 12,
    marginTop: 2,
  },

  promotedVenue: {
    color: T.warning,
    fontSize: 12.5,
    fontWeight: "700",
    marginHorizontal: 12,
  },

  promotedMeta: {
    color: T.textFaint,
    fontSize: 11.5,
    marginHorizontal: 12,
  },

  /* ---- tonight's offers strip ---- */
  offersRow: {
    flexGrow: 0,
    marginBottom: 14,
  },

  offers: {
    paddingHorizontal: 16,
    gap: 10,
  },

  offerCard: {
    width: 210,
    gap: 5,
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: "rgba(74,222,128,0.10)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.28)",
  },

  offerTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.radius.pill,
    backgroundColor: "rgba(74,222,128,0.16)",
  },

  offerTagText: {
    color: T.accent,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  offerTitle: {
    color: T.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },

  offerVenue: {
    color: T.textMuted,
    fontSize: 12.5,
    fontWeight: "700",
  },

  offerMeta: {
    color: T.accent,
    fontSize: 11.5,
    fontWeight: "700",
  },

  listContent: {
    paddingHorizontal: 12,
    paddingBottom: TAB_BAR_SPACE,
  },

  column: {
    justifyContent: "space-between",
  },

  /* ---- card ---- */
  card: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
    ...SHADOW_CARD,
  },

  image: {
    width: "100%",
    height: 130,
    backgroundColor: T.surfaceAlt,
  },

  dateBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radius.sm,
    backgroundColor: "rgba(0,0,0,0.72)",
  },

  dateBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  goingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radius.sm,
    backgroundColor: T.accent,
  },

  goingBadgeText: {
    color: "#04210f",
    fontSize: 10.5,
    fontWeight: "800",
  },

  cardBody: {
    padding: 10,
    gap: 4,
  },

  title: {
    fontSize: 14.5,
    fontWeight: "700",
    color: T.text,
    lineHeight: 19,
  },

  store: {
    fontSize: 12,
    color: T.textFaint,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 2,
  },

  genre: {
    flex: 1,
    fontSize: 11.5,
    color: T.accent,
    fontWeight: "600",
  },

  attendants: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  attendantsText: {
    color: T.textFaint,
    fontSize: 11,
    fontWeight: "700",
  },

  price: {
    fontSize: 11.5,
    color: T.textMuted,
    fontWeight: "600",
  },

  loader: {
    marginTop: 40,
  },

  footerLoader: {
    marginVertical: 20,
  },

  endOfList: {
    textAlign: "center",
    color: T.textFaint,
    fontSize: 12,
    marginVertical: 20,
  },

  error: {
    color: T.danger,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
