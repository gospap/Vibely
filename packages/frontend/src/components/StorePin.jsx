import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Star from "lucide-react-native/dist/esm/icons/star";
import Sparkles from "lucide-react-native/dist/esm/icons/sparkles";

// Paid placement is marked, never disguised: a promoted pin is bigger and gold,
// and carries a label saying so.
const GOLD = "#fbbf24";

export default function StorePin({ store, onPress }) {
  const thumbnail = store.images?.[0] || store.imageUrl || null;
  const rating = store.ratings?.average;
  const promoted = store.promoted;

  return (
    <TouchableOpacity
      style={styles.pinContainer}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {promoted ? (
        <View style={styles.promotedTag}>
          <Sparkles size={8} color="#1a1400" strokeWidth={2.8} />
          <Text style={styles.promotedTagText} numberOfLines={1}>
            {promoted.label}
          </Text>
        </View>
      ) : null}

      <View style={[styles.pinBubble, promoted && styles.pinBubblePromoted]}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.pinImage} />
        ) : (
          <View style={styles.pinIcon} />
        )}
      </View>

      <View
        style={[styles.labelContainer, promoted && styles.labelPromoted]}
      >
        <Text
          numberOfLines={1}
          style={[styles.labelText, promoted && styles.labelTextPromoted]}
        >
          {store.name}
        </Text>

        {rating ? (
          <View style={styles.rating}>
            <Star size={9} color={GOLD} fill={GOLD} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        ) : null}
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
  pinBubblePromoted: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 9,
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

  promotedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    backgroundColor: GOLD,
  },
  promotedTagText: {
    color: "#1a1400",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.2,
    maxWidth: 96,
  },

  labelContainer: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  labelPromoted: {
    backgroundColor: "rgba(26,20,0,0.88)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.55)",
  },
  labelText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
    maxWidth: 110,
  },
  labelTextPromoted: {
    color: GOLD,
    fontWeight: "800",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: "800",
  },
});
