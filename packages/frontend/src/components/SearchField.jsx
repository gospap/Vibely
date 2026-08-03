import { View, TextInput, Pressable, StyleSheet } from "react-native";
import { Search, X } from "lucide-react-native";
import { T } from "@/styles/theme";

export default function SearchField({
  value,
  onChangeText,
  placeholder = "Αναζήτηση",
  autoFocus = false,
  style,
}) {
  return (
    <View style={[styles.wrap, style]}>
      <Search size={17} color={T.textFaint} strokeWidth={2} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.textFaint}
        style={styles.input}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
      />

      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10}>
          <X size={16} color={T.textFaint} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.surfaceAlt,
    borderRadius: T.radius.sm,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    height: 42,
  },
  input: {
    flex: 1,
    color: T.text,
    fontSize: 15,
    padding: 0,
  },
});
