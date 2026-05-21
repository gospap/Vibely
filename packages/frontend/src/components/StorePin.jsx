import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

export default function StorePin({ store, onPress }) {
  const thumbnail = store.images?.[0] || store.imageUrl || null;

  return (
    <TouchableOpacity
      style={styles.pinContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.pinBubble}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.pinImage} />
        ) : (
          <View style={styles.pinIcon} />
        )}
      </View>
      <View style={styles.labelContainer}>
        <Text numberOfLines={1} style={styles.labelText}>
          {store.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pinContainer: {
    alignItems: "center",
  },
  pinBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#ffffff",
    backgroundColor: "#4F7CFF",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  pinImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  pinIcon: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  labelContainer: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  labelText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
    maxWidth: 120,
  },
});
