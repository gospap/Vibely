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

  content: {
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_SPACE,
    gap: 12,
  },

  storeName: {
    color: T.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },

  ranges: {
    flexDirection: "row",
    gap: 8,
  },

  range: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.radius.pill,
    backgroundColor: T.surface,
  },

  rangeActive: {
    backgroundColor: T.primarySoft,
  },

  rangeText: {
    color: T.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },

  rangeTextActive: {
    color: T.text,
  },

  loader: {
    marginTop: 60,
  },

  /* ---- cards ---- */
  card: {
    gap: 12,
    padding: 16,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
  },

  cardTitle: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  subLabel: {
    color: T.textFaint,
    fontSize: 11.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },

  /* ---- stats ---- */
  statRow: {
    flexDirection: "row",
    gap: 10,
  },

  stat: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 12,
    borderRadius: T.radius.sm,
    backgroundColor: T.surfaceAlt,
  },

  statValue: {
    color: T.text,
    fontSize: 22,
    fontWeight: "800",
  },

  statLabel: {
    color: T.textFaint,
    fontSize: 10.5,
    textAlign: "center",
    paddingHorizontal: 4,
  },

  /* ---- rates ---- */
  rateRow: {
    flexDirection: "row",
    gap: 10,
  },

  rate: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },

  rateValue: {
    color: T.text,
    fontSize: 17,
    fontWeight: "800",
  },

  rateLabel: {
    color: T.textFaint,
    fontSize: 11,
  },

  pending: {
    color: T.warning,
    fontSize: 12.5,
    fontWeight: "600",
  },

  /* ---- audience ---- */
  withheld: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    padding: 12,
    borderRadius: T.radius.sm,
    backgroundColor: T.surfaceAlt,
  },

  withheldText: {
    flex: 1,
    color: T.textFaint,
    fontSize: 12.5,
    lineHeight: 18,
  },

  genres: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  genre: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radius.pill,
    backgroundColor: T.surfaceAlt,
  },

  genreText: {
    color: T.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
  },

  /* ---- bars ---- */
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  barLabel: {
    width: 74,
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.elevated,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
  },

  barCount: {
    minWidth: 46,
    textAlign: "right",
    color: T.textFaint,
    fontSize: 11.5,
    fontWeight: "700",
  },

  footnote: {
    color: T.textFaint,
    fontSize: 11,
    textAlign: "center",
    paddingTop: 4,
  },
}));
