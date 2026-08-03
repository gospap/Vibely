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
    maxHeight: "90%",
    backgroundColor: T.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },

  scroll: {
    paddingBottom: 32,
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

  save: {
    position: "absolute",
    top: 14,
    right: 56,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    padding: 20,
    gap: 14,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  title: {
    flex: 1,
    color: T.text,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.4,
  },

  openTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.radius.pill,
    backgroundColor: "rgba(74,222,128,0.16)",
  },

  openTagClosed: {
    backgroundColor: "rgba(248,113,113,0.14)",
  },

  openTagText: {
    color: T.accent,
    fontSize: 11.5,
    fontWeight: "800",
  },

  openTagTextClosed: {
    color: T.danger,
  },

  meta: {
    color: T.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: -8,
  },

  address: {
    color: T.textFaint,
    fontSize: 12.5,
    marginTop: -8,
  },

  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -6,
  },

  hours: {
    color: T.textFaint,
    fontSize: 12.5,
  },

  description: {
    color: T.textMuted,
    fontSize: 14.5,
    lineHeight: 21,
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radius.pill,
    backgroundColor: T.surfaceAlt,
  },

  tagText: {
    color: T.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
  },

  section: {
    gap: 10,
    paddingTop: 6,
  },

  sectionTitle: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  /* ---- rating summary ---- */
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: T.surfaceAlt,
  },

  ratingBig: {
    alignItems: "center",
    gap: 4,
  },

  ratingValue: {
    color: T.text,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 36,
  },

  ratingCount: {
    color: T.textFaint,
    fontSize: 11.5,
  },

  histogram: {
    flex: 1,
    gap: 4,
  },

  histogramRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  histogramStar: {
    color: T.textFaint,
    fontSize: 10.5,
    width: 8,
  },

  histogramTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: T.elevated,
    overflow: "hidden",
  },

  histogramFill: {
    height: "100%",
    backgroundColor: T.warning,
  },

  /* ---- review form ---- */
  reviewForm: {
    gap: 10,
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: T.surfaceAlt,
  },

  reviewInput: {
    minHeight: 64,
    color: T.text,
    fontSize: 14,
    backgroundColor: T.elevated,
    borderRadius: T.radius.sm,
    padding: 12,
    textAlignVertical: "top",
  },

  /* ---- reviews list ---- */
  review: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
  },

  reviewBody: {
    flex: 1,
    gap: 4,
  },

  reviewHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  reviewAuthor: {
    color: T.text,
    fontSize: 13.5,
    fontWeight: "700",
  },

  reviewTime: {
    color: T.textFaint,
    fontSize: 11.5,
  },

  reviewText: {
    color: T.textMuted,
    fontSize: 13.5,
    lineHeight: 19,
  },

  /* ---- events ---- */
  event: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: T.radius.md,
    backgroundColor: T.surfaceAlt,
  },

  eventImage: {
    width: 48,
    height: 48,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
  },

  eventText: {
    flex: 1,
    gap: 2,
  },

  eventTitle: {
    color: T.text,
    fontSize: 14,
    fontWeight: "700",
  },

  eventMeta: {
    color: T.textFaint,
    fontSize: 12,
  },

  eventGenre: {
    color: T.accent,
    fontSize: 11.5,
    fontWeight: "600",
  },

  loader: {
    marginVertical: 60,
  },
});
