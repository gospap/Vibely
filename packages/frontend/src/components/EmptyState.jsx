import { View, Text, StyleSheet } from "react-native";
import { T } from "@/styles/theme";

export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <View style={styles.container}>
      {Icon ? <Icon size={34} color={T.textFaint} strokeWidth={1.6} /> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  title: {
    color: T.text,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: T.textFaint,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
