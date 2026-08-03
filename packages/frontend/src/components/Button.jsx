import { Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { T } from "@/styles/theme";

export default function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon: Icon,
  style,
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === "primary" ? "#fff" : T.text} />
      ) : (
        <>
          {Icon ? (
            <Icon
              size={16}
              color={variant === "primary" ? "#fff" : T.text}
              strokeWidth={2.2}
            />
          ) : null}
          <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: T.radius.sm,
  },
  primary: {
    backgroundColor: T.primary,
  },
  secondary: {
    backgroundColor: T.elevated,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: T.borderStrong,
  },
  danger: {
    backgroundColor: "rgba(248,113,113,0.14)",
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  primaryLabel: { color: "#fff" },
  secondaryLabel: { color: T.text },
  outlineLabel: { color: T.text },
  dangerLabel: { color: T.danger },
});
