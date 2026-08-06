import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import Search from "lucide-react-native/dist/esm/icons/search";
import X from "lucide-react-native/dist/esm/icons/x";
import SlidersHorizontal from "lucide-react-native/dist/esm/icons/sliders-horizontal";
import { T } from "@/styles/theme";

// Same glass treatment as the tab bar: a dark blur, a hairline highlight along
// the top edge, and a fully rounded pill. The two float over the same map, so
// they have to read as the same material.
export default function SearchField({
  value,
  onChangeText,
  placeholder = "Αναζήτηση",
  autoFocus = false,
  onFocus,
  onBlur,
  inputRef,
  // Filters live behind this button rather than as a row of chips under the
  // bar — on a map screen that row was covering the city.
  onFilterPress,
  filterCount = 0,
  filtersOpen = false,
  style,
}) {
  return (
    <BlurView intensity={60} tint="dark" style={[styles.wrap, style]}>
      <View style={styles.glassOverlay} pointerEvents="none" />

      <Search size={17} color="rgba(255,255,255,0.6)" strokeWidth={2} />

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={styles.input}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="never"
        onFocus={onFocus}
        onBlur={onBlur}
      />

      {value ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={10}>
          <X size={16} color="rgba(255,255,255,0.6)" strokeWidth={2.4} />
        </Pressable>
      ) : null}

      {onFilterPress ? (
        <Pressable
          onPress={onFilterPress}
          hitSlop={8}
          style={[styles.filter, filtersOpen && styles.filterOpen]}
        >
          <SlidersHorizontal
            size={16}
            color={filtersOpen || filterCount ? T.primary : "rgba(255,255,255,0.6)"}
            strokeWidth={2.3}
          />
          {/* A count rather than a dot: the user should know how many filters
              are on without opening the panel to find out. */}
          {filterCount ? (
            <Text style={styles.filterCount}>{filterCount}</Text>
          ) : null}
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
  filter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 2,
    marginRight: -4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
  },
  filterOpen: {
    backgroundColor: "rgba(79,124,255,0.18)",
  },
  filterCount: {
    color: T.primary,
    fontSize: 11.5,
    fontWeight: "800",
  },
});
