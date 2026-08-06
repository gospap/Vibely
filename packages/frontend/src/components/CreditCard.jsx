import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { makeStyles, useStyles, useTheme } from "@/styles/theme";

// Issuer names only. Colour comes from the finish below instead, because two
// Visas on one account would otherwise be the same rectangle twice.
const BRAND_LABELS = {
  visa: "VISA",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  diners: "Diners Club",
  jcb: "JCB",
  unionpay: "UnionPay",
};

// Finishes, the way a bank offers a card in a few colourways. Each is dark
// enough to carry white numerals at the contrast the rest of the app uses.
const FINISHES = [
  { name: "British racing green", colors: ["#0b4a34", "#04241a"] },
  { name: "Midnight", colors: ["#16233f", "#080e1c"] },
  { name: "Oxblood", colors: ["#5c1220", "#26080e"] },
  { name: "Graphite", colors: ["#3c3c43", "#191919"] },
  { name: "Violet", colors: ["#3a1d5c", "#170a25"] },
  { name: "Bronze", colors: ["#6b4a1f", "#2e1f0b"] },
];

// Stable per card when no explicit finish is passed, so a card keeps its colour
// across reloads rather than shuffling on every render.
const finishFor = (card, index) => {
  if (Number.isInteger(index)) return FINISHES[index % FINISHES.length];

  const seed = String(card?.id ?? card?.last4 ?? "");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;

  return FINISHES[hash % FINISHES.length];
};

/**
 * The card Vibely bills this account on.
 *
 * Display only — it never takes a card number. Entering one happens in Stripe's
 * hosted Checkout and Portal, which is the only place raw card details are
 * allowed to exist, so all this ever receives is the brand and the last four
 * digits Stripe hands back.
 *
 * @param {object|null} card    { id, brand, last4, expMonth, expYear, name } or null
 * @param {number}      [finish] Index into FINISHES. The stack passes each card
 *                               its position so the colours stay put when the
 *                               pile is reordered.
 */
export default function CreditCard({ card, finish }) {
  const T = useTheme();
  const styles = useStyles(styleSheet);
  const colors = card
    ? finishFor(card, finish).colors
    : [T.elevated, T.surfaceAlt];

  const expiry = card
    ? `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`
    : "--/--";

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, !card && styles.cardEmpty]}
    >
      {/* Chip and contactless mark: the two things that make a rectangle read
          as a bank card rather than a coloured box. */}
      <View style={styles.top}>
        <View style={styles.chip}>
          <View style={styles.chipLine} />
          <View style={styles.chipLine} />
        </View>

        <View style={styles.waves}>
          <View style={[styles.wave, { height: 9, opacity: 0.35 }]} />
          <View style={[styles.wave, { height: 13, opacity: 0.5 }]} />
          <View style={[styles.wave, { height: 17, opacity: 0.7 }]} />
        </View>
      </View>

      <Text style={styles.number}>
        {card ? `•••• •••• •••• ${card.last4}` : "•••• •••• •••• ••••"}
      </Text>

      <View style={styles.bottom}>
        <View style={styles.holder}>
          {/* The cardholder name is the only thing that separates two cards on
              the same account at a glance — same brand, same expiry style,
              different person. */}
          {card?.name ? (
            <Text style={styles.name} numberOfLines={1}>
              {card.name.toUpperCase()}
            </Text>
          ) : null}

          <Text style={styles.caption}>Λήγει {expiry}</Text>
        </View>

        <Text style={styles.brand} numberOfLines={1}>
          {card
            ? (BRAND_LABELS[card.brand] ?? card.brand?.toUpperCase())
            : "Καμία κάρτα ακόμα"}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styleSheet = makeStyles((T) => ({
  card: {
    // The real thing is 85.6 × 53.98mm; anything squarer stops reading as a card.
    aspectRatio: 1.586,
    borderRadius: T.radius.md,
    padding: 16,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  cardEmpty: {
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.22)",
  },

  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  chip: {
    width: 40,
    height: 30,
    borderRadius: 6,
    backgroundColor: "rgba(255,214,125,0.85)",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 6,
  },

  chipLine: {
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  waves: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  wave: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#fff",
  },

  number: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 2.2,
  },

  bottom: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },

  holder: {
    flex: 1,
    gap: 2,
  },

  name: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.1,
  },

  caption: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  brand: {
    flexShrink: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4,
    textAlign: "right",
  },
}));
