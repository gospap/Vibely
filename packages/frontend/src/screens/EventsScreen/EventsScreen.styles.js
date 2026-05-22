import { StyleSheet } from "react-native";
import { COLORS } from "@/styles/global";
export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    marginBottom: 12,
    flex: 1,
    marginHorizontal: 5,
    overflow: "hidden",

    // shadow iOS
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },

    // shadow Android
    elevation: 5,
  },

  image: {
    width: "100%",
    height: 140,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    paddingHorizontal: 10,
    paddingTop: 8,
  },

  date: {
    fontSize: 12,
    color: "#aaa",
    paddingHorizontal: 10,
    marginTop: 2,
  },

  genre: {
    fontSize: 12,
    color: "#4ade80",
    paddingHorizontal: 10,
    marginTop: 4,
  },

  description: {
    fontSize: 12,
    color: "#ccc",
    paddingHorizontal: 10,
    paddingBottom: 10,
    marginTop: 6,
  },

  /* =========================
      MASONRY LAYOUT
  ========================= */
  masonry: {
    flexDirection: "row",
    padding: 5,
  },

  column: {
    flex: 1,
  },

  /* =========================
      MODAL BACKDROP (IMPORTANT)
  ========================= */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  /* =========================
      MODAL CARD (BOTTOM SHEET)
  ========================= */
  modalCard: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,

    // shadow
    elevation: 10,
  },

  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginTop: 10,
  },

  modalDate: {
    marginTop: 6,
    color: "#aaa",
    fontSize: 13,
  },

  modalGenre: {
    marginTop: 6,
    color: "#4ade80",
    fontWeight: "600",
  },

  modalDescription: {
    marginTop: 12,
    color: "#ddd",
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    marginTop: 18,
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  closeButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
