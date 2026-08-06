import { makeStyles, TAB_BAR_SPACE } from "@/styles/theme";

export default makeStyles((T) => ({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  title: {
    color: T.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },

  chipsRow: {
    flexGrow: 0,
    marginBottom: 12,
  },

  chips: {
    gap: 8,
    paddingHorizontal: 16,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.radius.pill,
    backgroundColor: T.surface,
  },

  chipActive: {
    backgroundColor: T.primarySoft,
  },

  chipText: {
    color: T.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },

  chipTextActive: {
    color: T.text,
  },

  segments: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  segment: {
    paddingHorizontal: 14,
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

  loader: {
    marginTop: 60,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_SPACE,
    gap: 10,
  },

  row: {
    gap: 10,
    padding: 12,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
  },

  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  rowText: {
    flex: 1,
    gap: 4,
  },

  guest: {
    color: T.text,
    fontSize: 14.5,
    fontWeight: "700",
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

  night: {
    color: T.textMuted,
    fontSize: 12.5,
    fontWeight: "700",
  },

  fact: {
    color: T.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
  },

  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: T.radius.pill,
  },

  pillText: {
    fontSize: 10.5,
    fontWeight: "800",
  },

  note: {
    color: T.textMuted,
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },

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
}));
