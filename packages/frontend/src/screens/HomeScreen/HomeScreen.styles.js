import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  routeCard: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: "white",
    padding: 14,
    borderRadius: 16,
    elevation: 5,
  },
  focusButton: {
    position: "absolute",
    right: 20,
    bottom: 120,
    backgroundColor: "white",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },

  focusText: {
    fontSize: 22,
  },

  routeText: {
    fontSize: 16,
    fontWeight: "700",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },

  modalImage: {
    width: "100%",
    height: 220,
  },

  modalContent: {
    padding: 20,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },

  modalDescription: {
    marginTop: 10,
    color: "#555",
  },

  closeButton: {
    marginTop: 16,
    backgroundColor: "#4F7CFF",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  closeButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
