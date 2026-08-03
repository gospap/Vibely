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
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },

  headerTitle: {
    color: T.text,
    fontSize: 16,
    fontWeight: "700",
  },

  content: {
    padding: 20,
    gap: 24,
  },

  hero: {
    alignItems: "center",
    gap: 10,
  },

  name: {
    color: T.text,
    fontSize: 22,
    fontWeight: "800",
  },

  bio: {
    color: T.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  actionButton: {
    flex: 1,
  },

  section: {
    gap: 10,
  },

  sectionTitle: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  genres: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  genre: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: T.radius.pill,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
  },

  genreText: {
    color: T.text,
    fontSize: 13,
    fontWeight: "600",
  },

  member: {
    color: T.textFaint,
    fontSize: 12.5,
    textAlign: "center",
  },

  loader: {
    marginTop: 60,
  },
});
