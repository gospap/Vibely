import { Text, Pressable, StyleSheet } from "react-native";
import { T } from "@/styles/theme";

export default function Chip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.radius.pill,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  label: {
    color: T.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  labelActive: {
    color: "#fff",
  },
});
