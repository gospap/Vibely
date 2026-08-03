import { View, Text, Pressable, StyleSheet } from "react-native";
import { Star } from "lucide-react-native";
import { T } from "@/styles/theme";

// Read-only by default. Pass onChange to turn it into the review input — the
// same component then renders the tap targets for picking a score.
export default function RatingStars({
  value = 0,
  count,
  size = 14,
  onChange,
  showValue = true,
}) {
  const interactive = typeof onChange === "function";

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);

        const icon = (
          <Star
            size={interactive ? size + 8 : size}
            color={filled ? T.warning : T.textFaint}
            fill={filled ? T.warning : "transparent"}
            strokeWidth={2}
          />
        );

        return interactive ? (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            hitSlop={6}
            style={styles.tap}
          >
            {icon}
          </Pressable>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}

      {showValue && !interactive ? (
        <Text style={[styles.value, { fontSize: size - 1 }]}>
          {value ? value.toFixed(1) : "—"}
          {count != null ? ` (${count})` : ""}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tap: {
    paddingHorizontal: 3,
  },
  value: {
    marginLeft: 6,
    color: T.textMuted,
    fontWeight: "600",
  },
});
