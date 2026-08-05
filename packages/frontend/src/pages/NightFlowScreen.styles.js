import { StyleSheet } from "react-native";
import { T } from "@/styles/theme";

export default StyleSheet.create({
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

  loader: {
    marginTop: 80,
  },

  empty: {
    alignItems: "center",
    gap: 8,
    paddingTop: 90,
    paddingHorizontal: 40,
  },

  emptyTitle: {
    color: T.text,
    fontSize: 17,
    fontWeight: "800",
  },

  emptyText: {
    color: T.textFaint,
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 19,
  },

  /* ---- the hour ---- */
  clock: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  hour: {
    color: T.text,
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: -1.5,
    lineHeight: 50,
  },

  clockRight: {
    alignItems: "flex-end",
    paddingBottom: 6,
  },

  lead: {
    fontSize: 17,
    fontWeight: "800",
  },

  leadSub: {
    color: T.textFaint,
    fontSize: 12,
  },

  /* ---- the city ---- */
  canvas: {
    alignSelf: "center",
    marginVertical: 6,
    borderRadius: T.radius.lg,
    backgroundColor: T.surface,
    overflow: "hidden",
  },

  /* ---- timeline ---- */
  timeline: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  tick: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },

  bar: {
    width: 7,
    borderRadius: 4,
  },

  tickLabel: {
    color: T.textFaint,
    fontSize: 9.5,
    fontWeight: "700",
  },

  tickLabelOn: {
    color: T.text,
  },

  /* ---- controls ---- */
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  play: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: T.radius.pill,
    backgroundColor: T.primary,
  },

  playText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  legend: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendText: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
});
