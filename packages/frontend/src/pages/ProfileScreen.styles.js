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

  /* ---- hero ---- */
  hero: {
    alignItems: "center",
    gap: 6,
    paddingTop: 26,
    paddingBottom: 0,
    borderRadius: T.radius.lg,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },

  editIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surfaceAlt,
  },

  name: {
    color: T.text,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 6,
  },

  email: {
    color: T.textFaint,
    fontSize: 12.5,
  },

  bio: {
    color: T.textMuted,
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
    paddingHorizontal: 24,
  },

  /* ---- stats strip inside the hero ---- */
  stats: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.surfaceAlt,
  },

  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 13,
  },

  statDivider: {
    width: 1,
    marginVertical: 10,
    backgroundColor: T.border,
  },

  statValue: {
    color: T.text,
    fontSize: 18,
    fontWeight: "800",
  },

  statLabel: {
    color: T.textFaint,
    fontSize: 10.5,
    fontWeight: "600",
  },

  /* ---- grouped rows ---- */
  group: {
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },

  divider: {
    height: 1,
    marginLeft: 14,
    backgroundColor: T.border,
  },

  /* ---- bookings link ---- */
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },

  linkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  linkLabel: {
    flex: 1,
    color: T.text,
    fontSize: 14.5,
    fontWeight: "700",
  },

  /* ---- billing (tenant) ---- */
  billingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  billingImage: {
    width: 34,
    height: 34,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
  },

  billingText: {
    flex: 1,
    gap: 2,
  },

  billingVenue: {
    color: T.text,
    fontSize: 14,
    fontWeight: "700",
  },

  billingState: {
    fontSize: 11.5,
    fontWeight: "700",
  },

  billingEmpty: {
    color: T.textFaint,
    fontSize: 12.5,
    lineHeight: 18,
    padding: 14,
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
  // Inside a group now, so the divider between rows is drawn by the parent
  // rather than each row carrying its own border.
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },

  toggleLabel: {
    flex: 1,
    color: T.text,
    fontSize: 13.5,
  },

  /* ---- account details ---- */
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
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
