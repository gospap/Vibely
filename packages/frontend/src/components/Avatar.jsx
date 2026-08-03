import { View, Text, Image, StyleSheet } from "react-native";
import { T } from "@/styles/theme";

// Falls back to the first letter of the name, so a user without a photo still
// gets something stable to look at.
export default function Avatar({ uri, name, size = 48, ring = false }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  const frame = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: ring ? 2 : 0,
    borderColor: ring ? T.primary : "transparent",
  };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, frame]} />;
  }

  return (
    <View style={[styles.fallback, frame]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: T.surfaceAlt,
  },
  fallback: {
    backgroundColor: T.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: T.textMuted,
    fontWeight: "700",
  },
});
