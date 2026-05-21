import { StyleSheet } from "react-native";
import { FONT_FAMILY, COLORS, SHADOW } from "@/styles/global";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FB",
  },
  loadingText: {
    color: "#1C1C1E",
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 18,
  },
  name: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    fontFamily: FONT_FAMILY,
  },
  email: {
    color: "#4B5563",
    fontSize: 14,
    fontFamily: FONT_FAMILY,
  },
  cardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    fontFamily: FONT_FAMILY,
  },
  cardLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: FONT_FAMILY,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
    fontFamily: FONT_FAMILY,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  detailLabel: {
    color: "#6B7280",
    fontSize: 14,
    fontFamily: FONT_FAMILY,
  },
  detailValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: FONT_FAMILY,
  },
  actions: {
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: "#4F7CFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
});
