import { StyleSheet } from "react-native";
import { T, TAB_BAR_SPACE } from "@/styles/theme";

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

  filterPanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
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
    paddingBottom: TAB_BAR_SPACE,
  },

  /* ---- card: a short full-width row, same family as the promoted banner ---- */
  card: {
    flexDirection: "row",
    height: 78,
    backgroundColor: T.surface,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },

  image: {
    width: 78,
    height: 78,
    backgroundColor: T.surfaceAlt,
  },

  cardBody: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 11,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  title: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.2,
  },

  goingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: T.radius.pill,
    backgroundColor: T.accent,
  },

  goingBadgeText: {
    color: "#04210f",
    fontSize: 9.5,
    fontWeight: "900",
  },

  store: {
    fontSize: 11.5,
    color: T.textFaint,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  when: {
    fontSize: 11,
    color: T.textMuted,
    fontWeight: "700",
  },

  genre: {
    flex: 1,
    fontSize: 11,
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
    fontSize: 10.5,
    fontWeight: "700",
  },

  price: {
    fontSize: 11,
    color: T.textMuted,
    fontWeight: "700",
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
