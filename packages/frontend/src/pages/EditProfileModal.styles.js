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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    gap: 20,
    paddingBottom: 60,
  },

  avatarPicker: {
    alignSelf: "center",
  },

  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: T.bg,
  },

  field: {
    gap: 8,
  },

  fieldLabel: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  input: {
    color: T.text,
    fontSize: 15,
    backgroundColor: T.surfaceAlt,
    borderRadius: T.radius.sm,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  inputMultiline: {
    minHeight: 84,
    textAlignVertical: "top",
  },

  counter: {
    color: T.textFaint,
    fontSize: 11.5,
    alignSelf: "flex-end",
  },

  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
