import { StyleSheet } from "react-native";
import { T } from "@/styles/theme";

export default StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.bg,
  },

  /* ---- floating search + category filters ---- */
  searchOverlay: {
    position: "absolute",
    top: 54,
    left: 0,
    right: 0,
    gap: 10,
  },

  search: {
    marginHorizontal: 16,
    backgroundColor: "rgba(23,23,25,0.94)",
    borderColor: T.borderStrong,
    height: 46,
  },

  filterPanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    padding: 12,
    borderRadius: 22,
    backgroundColor: "rgba(13, 13, 15, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },

  chips: {
    paddingHorizontal: 16,
    gap: 8,
  },

  /* ---- search results ---- */
  results: {
    marginTop: 8,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(13, 13, 15, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },

  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  resultImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.elevated,
  },

  resultText: {
    flex: 1,
  },

  resultName: {
    color: T.text,
    fontSize: 14,
    fontWeight: "700",
  },

  resultMeta: {
    color: T.textFaint,
    fontSize: 11.5,
  },

  resultsLoader: {
    paddingVertical: 14,
  },

  resultEmpty: {
    color: T.textFaint,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  more: {
    alignItems: "center",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },

  moreText: {
    color: T.primary,
    fontSize: 12.5,
    fontWeight: "700",
  },



  hidden: { display: "none" },

  /* ---- upcoming turn ---- */
  maneuverCard: {
    position: "absolute",
    top: 54,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(23,23,25,0.96)",
    borderWidth: 1,
    borderColor: T.borderStrong,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: T.radius.md,
    elevation: 6,
  },

  maneuverIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.primarySoft,
  },

  maneuverBody: { flex: 1 },

  maneuverDistance: {
    fontSize: 20,
    fontWeight: "800",
    color: T.text,
  },

  maneuverText: {
    fontSize: 13,
    fontWeight: "600",
    color: T.textMuted,
    marginTop: 2,
  },

  /* ---- navigation card ---- */
  routeCard: {
    position: "absolute",
    bottom: 130,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(23,23,25,0.96)",
    borderWidth: 1,
    borderColor: T.borderStrong,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: T.radius.md,
    elevation: 6,
  },

  routeStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  routeStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  routeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  routeText: {
    fontSize: 14,
    fontWeight: "600",
    color: T.text,
  },

  focusButton: {
    position: "absolute",
    right: 16,
    bottom: 200,
    backgroundColor: "rgba(23,23,25,0.96)",
    borderWidth: 1,
    borderColor: T.borderStrong,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});
