import { StyleSheet } from "react-native";
import { T, TAB_BAR_SPACE } from "@/styles/theme";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: T.bg,
  },

  loadingText: {
    color: T.textMuted,
    fontSize: 14,
  },

  content: {
    padding: 20,
    paddingBottom: TAB_BAR_SPACE,
    gap: 24,
  },

  /* ---- header ---- */
  header: {
    alignItems: "center",
    gap: 12,
  },

  headerText: {
    alignItems: "center",
    gap: 4,
  },

  name: {
    color: T.text,
    fontSize: 22,
    fontWeight: "800",
  },

  email: {
    color: T.textFaint,
    fontSize: 13,
  },

  bio: {
    color: T.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
    paddingHorizontal: 12,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: T.radius.pill,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
  },

  editButtonText: {
    color: T.text,
    fontSize: 13,
    fontWeight: "700",
  },

  /* ---- stat cards ---- */
  cardsRow: {
    flexDirection: "row",
    gap: 10,
  },

  card: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 16,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },

  cardValue: {
    color: T.text,
    fontSize: 22,
    fontWeight: "800",
  },

  cardLabel: {
    color: T.textFaint,
    fontSize: 11.5,
    fontWeight: "600",
  },

  /* ---- sections ---- */
  section: {
    gap: 10,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  sectionAction: {
    color: T.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  /* ---- bookings link ---- */
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
  },

  linkLabel: {
    flex: 1,
    color: T.text,
    fontSize: 14.5,
    fontWeight: "700",
  },

  /* ---- stamp cards ---- */
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
  },

  cardImage: {
    width: 46,
    height: 46,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
  },

  cardText: {
    flex: 1,
    gap: 4,
  },

  cardName: {
    color: T.text,
    fontSize: 14,
    fontWeight: "700",
  },

  cardReward: {
    color: T.textFaint,
    fontSize: 12,
  },

  cardTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: T.elevated,
    overflow: "hidden",
    marginTop: 2,
  },

  cardFill: {
    height: "100%",
    backgroundColor: T.accent,
  },

  cardCount: {
    alignItems: "center",
    gap: 3,
  },

  cardCountText: {
    color: T.accent,
    fontSize: 12.5,
    fontWeight: "800",
  },

  /* ---- events ---- */
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },

  eventImage: {
    width: 48,
    height: 48,
    borderRadius: T.radius.sm,
    backgroundColor: T.surfaceAlt,
  },

  eventText: {
    flex: 1,
    gap: 3,
  },

  eventTitle: {
    color: T.text,
    fontSize: 14.5,
    fontWeight: "700",
  },

  eventMeta: {
    color: T.textFaint,
    fontSize: 12,
  },

  /* ---- friends ---- */
  friendsRow: {
    gap: 14,
    paddingVertical: 4,
  },

  friend: {
    alignItems: "center",
    gap: 6,
    width: 64,
  },

  friendName: {
    color: T.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
  },

  /* ---- toggles ---- */
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: T.radius.sm,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },

  toggleLabel: {
    flex: 1,
    color: T.text,
    fontSize: 14,
  },

  /* ---- account details ---- */
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },

  detailLabel: {
    color: T.textFaint,
    fontSize: 13,
  },

  detailValue: {
    flex: 1,
    color: T.text,
    fontSize: 13.5,
    fontWeight: "600",
    textAlign: "right",
  },

  /* ---- misc ---- */
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: T.radius.sm,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },

  emptyText: {
    flex: 1,
    color: T.textFaint,
    fontSize: 13,
  },

  loader: {
    marginVertical: 16,
  },

  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: T.radius.sm,
    backgroundColor: "rgba(248,113,113,0.12)",
  },

  logoutText: {
    color: T.danger,
    fontSize: 14,
    fontWeight: "700",
  },
});
