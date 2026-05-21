import { StyleSheet } from "react-native";
import { FONT_FAMILY, COLORS, SHADOW } from "@/styles/global";

export default StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },

  title: {
    fontSize: 28,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: "800",
    fontFamily: FONT_FAMILY,
  },

  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: 24,
    fontWeight: "500",
    fontFamily: FONT_FAMILY,
  },

  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
  },

  button: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    ...SHADOW,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: FONT_FAMILY,
  },

  linkContainer: {
    marginTop: 16,
    alignItems: "center",
  },

  link: {
    color: COLORS.primary,
    marginTop: 15,
    textAlign: "center",
    fontWeight: "600",
    fontFamily: FONT_FAMILY,
  },
});
