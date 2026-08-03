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

  chips: {
    paddingHorizontal: 16,
    gap: 8,
  },

  resultCount: {
    alignSelf: "flex-start",
    marginLeft: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radius.pill,
    backgroundColor: "rgba(23,23,25,0.94)",
  },

  resultCountText: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "600",
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
    gap: 18,
  },

  routeText: {
    fontSize: 15,
    fontWeight: "700",
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
