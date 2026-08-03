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

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.5,
  },

  /* ---- segmented tabs ---- */
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: T.radius.pill,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
  },

  tabActive: {
    backgroundColor: T.elevated,
    borderColor: T.borderStrong,
  },

  tabLabel: {
    color: T.textFaint,
    fontSize: 13,
    fontWeight: "600",
  },

  tabLabelActive: {
    color: T.text,
  },

  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  tabBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  /* ---- chat list rows ---- */
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  chatText: {
    flex: 1,
    gap: 3,
  },

  chatName: {
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
  },

  chatPreview: {
    color: T.textFaint,
    fontSize: 13,
  },

  chatPreviewUnread: {
    color: T.text,
    fontWeight: "600",
  },

  chatMeta: {
    alignItems: "flex-end",
    gap: 6,
  },

  chatTime: {
    color: T.textFaint,
    fontSize: 11.5,
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  listContent: {
    paddingBottom: TAB_BAR_SPACE,
  },

  loader: {
    marginTop: 40,
  },

  error: {
    color: T.danger,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
