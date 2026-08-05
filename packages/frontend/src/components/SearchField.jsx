import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Search, X } from "lucide-react-native";
import { T } from "@/styles/theme";

// Same glass treatment as the tab bar: a dark blur, a hairline highlight along
// the top edge, and a fully rounded pill. The two float over the same map, so
// they have to read as the same material.
export default function SearchField({
  value,
  onChangeText,
  placeholder = "Αναζήτηση",
  autoFocus = false,
  style,
}) {
  return (
    <BlurView intensity={60} tint="dark" style={[styles.wrap, style]}>
      <View style={styles.glassOverlay} pointerEvents="none" />

      <Search size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={styles.input}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
      />

      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10}>
          <X size={16} color="rgba(255,255,255,0.6)" strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(10, 15, 28, 0.45)",
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.16)",
    borderRadius: 24,
  },
  input: {
    flex: 1,
    color: T.text,
    fontSize: 15,
    fontWeight: "500",
    padding: 0,
  },
});
