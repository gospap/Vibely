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

  segments: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  segment: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: T.radius.pill,
    backgroundColor: T.surface,
  },

  segmentActive: {
    backgroundColor: T.primarySoft,
  },

  segmentText: {
    color: T.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },

  segmentTextActive: {
    color: T.text,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_SPACE,
    gap: 10,
  },

  loader: {
    marginTop: 60,
  },

  row: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
  },

  image: {
    width: 58,
    height: 58,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
  },

  rowBody: {
    flex: 1,
    gap: 5,
  },

  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  storeName: {
    flex: 1,
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
  },

  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: T.radius.pill,
  },

  pillText: {
    fontSize: 10.5,
    fontWeight: "800",
  },

  facts: {
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

  event: {
    color: T.accent,
    fontSize: 12,
    fontWeight: "600",
  },

  table: {
    color: T.primary,
    fontSize: 12.5,
    fontWeight: "700",
  },

  responseNote: {
    color: T.textFaint,
    fontSize: 12.5,
    fontStyle: "italic",
    lineHeight: 17,
  },

  cancel: {
    color: T.danger,
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 2,
  },
}));
