import { View, Text, Image, Pressable, StyleSheet, Dimensions } from "react-native";
import {
  Crown,
  Martini,
  CalendarCheck,
  Gift,
  Radio,
  Music,
} from "lucide-react-native";
import { T } from "@/styles/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const HEIGHT = 104;
// Where the diagonal crosses the middle of the card. The edge leans from here,
// so the image reads as roughly the left 60%.
const SPLIT = 0.6;
// A 45° lean means the edge travels its own height sideways: half above the
// midpoint, half below. That overhang is what has to be skewed out of frame.
const LEAN = HEIGHT / 2;

const GOLD = "#fbbf24";

// What the venue is offering tonight, as icons rather than a sentence — the
// card is only 104px tall and a line of text would eat all of it.
const CAPABILITIES = [
  { key: "offer", Icon: Martini, label: "Προσφορά" },
  { key: "bookings", Icon: CalendarCheck, label: "Κρατήσεις" },
  { key: "loyalty", Icon: Gift, label: "Πόντοι" },
  { key: "live", Icon: Radio, label: "Live τώρα" },
];

const capabilitiesOf = (store) => {
  if (!store) return [];

  const on = {
    offer: !!store.offer,
    bookings: !!(store.bookingsEnabled ?? store.bookings?.enabled),
    loyalty: !!store.loyalty?.enabled,
    live: !!store.live,
  };

  return CAPABILITIES.filter(({ key }) => on[key]);
};

// A full-bleed banner: image on the left, a dark panel on the right, and a 45°
// cut between them. Short enough to sit above the feed like a header.
export default function PromotedCard({ event, onPress }) {
  const store = event.store;
  const capabilities = capabilitiesOf(store);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: event.images?.[0] }} style={styles.image} />

      {/* Darkened towards the split so the title stays readable over any photo */}
      <View style={styles.imageShade} pointerEvents="none" />

      {/* The skewed slab. Its content is drawn separately so the text is not
          slanted with it. */}
      <View style={styles.panel} pointerEvents="none" />
      <View style={styles.panelEdge} pointerEvents="none" />

      {/* ---- left: the event ---- */}
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>

        {capabilities.length ? (
          <View style={styles.icons}>
            {capabilities.map(({ key, Icon }) => (
              <View key={key} style={styles.iconChip}>
                <Icon size={12} color={GOLD} strokeWidth={2.4} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.icons}>
            <View style={styles.iconChip}>
              <Music size={12} color={GOLD} strokeWidth={2.4} />
            </View>
          </View>
        )}
      </View>

      {/* ---- right: who paid for the slot ---- */}
      <View style={styles.right}>
        <Crown size={17} color={GOLD} strokeWidth={2.4} fill={GOLD} />
        <Text style={styles.venue} numberOfLines={1}>
          {store?.name}
        </Text>
        <Text style={styles.when} numberOfLines={1}>
          {event.startHour}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH,
    height: HEIGHT,
    marginLeft: -16,
    marginBottom: 14,
    backgroundColor: T.surface,
    overflow: "hidden",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
  },

  image: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH * SPLIT + LEAN,
    height: HEIGHT,
    resizeMode: "cover",
  },

  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },

  // Skewed on X so its leading edge runs at 45°. Pushed past the right edge so
  // the overhang is clipped rather than leaving a wedge of background.
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: SCREEN_WIDTH * SPLIT,
    right: -LEAN * 2,
    backgroundColor: "#14100a",
    transform: [{ skewX: "-45deg" }],
  },

  panelEdge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: SCREEN_WIDTH * SPLIT,
    width: 2,
    backgroundColor: GOLD,
    transform: [{ skewX: "-45deg" }],
  },

  left: {
    position: "absolute",
    left: 16,
    bottom: 14,
    width: SCREEN_WIDTH * SPLIT - 40,
    gap: 7,
  },

  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  icons: {
    flexDirection: "row",
    gap: 6,
  },

  iconChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,0.16)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.4)",
  },

  right: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH * (1 - SPLIT) - 32,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
  },

  venue: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },

  when: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11.5,
    fontWeight: "600",
  },
});
