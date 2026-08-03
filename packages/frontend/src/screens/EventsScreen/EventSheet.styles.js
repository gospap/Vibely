import { StyleSheet } from "react-native";
import { T } from "@/styles/theme";

export default StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  backdropTap: {
    flex: 1,
  },

  sheet: {
    maxHeight: "88%",
    backgroundColor: T.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },

  scroll: {
    paddingBottom: 32,
  },

  hero: {
    width: "100%",
    height: 210,
    backgroundColor: T.surfaceAlt,
  },

  close: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    padding: 20,
    gap: 18,
  },

  title: {
    color: T.text,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  date: {
    color: T.accent,
    fontSize: 14,
    fontWeight: "600",
    marginTop: -12,
  },

  facts: {
    flexDirection: "row",
    gap: 8,
  },

  fact: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surfaceAlt,
  },

  factLabel: {
    color: T.textFaint,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
  },

  factValue: {
    color: T.text,
    fontSize: 13,
    fontWeight: "700",
  },

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

  lineup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  dj: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: T.radius.pill,
    backgroundColor: "rgba(74,222,128,0.12)",
  },

  djText: {
    color: T.accent,
    fontSize: 13,
    fontWeight: "700",
  },

  description: {
    color: T.textMuted,
    fontSize: 14.5,
    lineHeight: 21,
  },

  store: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surfaceAlt,
  },

  storeImage: {
    width: 54,
    height: 54,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
  },

  storeText: {
    flex: 1,
    gap: 3,
  },

  storeName: {
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
  },

  storeArea: {
    color: T.textFaint,
    fontSize: 12.5,
  },

  storeAction: {
    alignItems: "center",
    gap: 2,
  },

  storeActionText: {
    color: T.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  attendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  avatars: {
    flexDirection: "row",
  },

  avatarWrap: {
    marginRight: -10,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: T.surface,
  },

  avatarMore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.elevated,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarMoreText: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },

  noAttendants: {
    color: T.textFaint,
    fontSize: 13,
  },

  loader: {
    marginVertical: 60,
  },
});
