import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";

import CreditCard from "./CreditCard";
import { useTheme } from "@/styles/theme";

// How much of each card behind the front one stays visible. Enough for the
// issuer strip and the cardholder name, which is what tells two cards apart.
const PEEK = 52;
const RATIO = 1.586;

/**
 * The cards saved on the account, held the way a wallet holds them — overlapping,
 * the live one in front, the rest peeking out behind it. Tapping one behind
 * slides it to the front.
 *
 * @param {Array}    cards      from GET /billing/payment-methods, default first
 * @param {Function} onSelect   called with the card that just came to the front
 * @param {Function} onPress    tapping the card already in front
 */
export default function CardStack({ cards = [], onSelect, onPress }) {
  const T = useTheme();

  // Measured rather than assumed: the card keeps a real card's proportions, so
  // its height depends on whatever width the section gives it.
  const [width, setWidth] = useState(0);
  const cardHeight = width ? width / RATIO : 0;

  // Back to front. The API sorts the default first, so it is reversed here to
  // put the card being charged on top of the pile.
  const [order, setOrder] = useState(() => [...cards].map((c) => c.id).reverse());

  // Keep up with cards being added or removed upstream without throwing away an
  // order the user has already rearranged.
  useEffect(() => {
    setOrder((prev) => {
      const ids = cards.map((c) => c.id);
      const kept = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id)).reverse();
      return [...added, ...kept];
    });
  }, [cards]);

  const stack = order
    .map((id) => cards.find((c) => c.id === id))
    .filter(Boolean);

  // One slide position per card, kept across renders so a reorder animates from
  // wherever the card currently is rather than snapping.
  const slides = useRef({}).current;
  const slideFor = (id, initial) => {
    if (!slides[id]) slides[id] = new Animated.Value(initial);
    return slides[id];
  };

  useEffect(() => {
    if (!cardHeight) return;

    Animated.parallel(
      stack.map((card, index) =>
        Animated.spring(slideFor(card.id, index * PEEK), {
          toValue: index * PEEK,
          useNativeDriver: true,
          damping: 17,
          stiffness: 170,
          mass: 0.85,
        }),
      ),
    ).start();
  }, [order, cardHeight, stack.length]);

  // An empty wallet still shows a card outline — a venue on trial has not paid
  // yet, and a blank space says nothing about where the card will go.
  if (!cards.length) {
    return (
      <Pressable onPress={onPress}>
        <CreditCard card={null} />
      </Pressable>
    );
  }

  const bringToFront = (card) => {
    setOrder((prev) => [...prev.filter((id) => id !== card.id), card.id]);
    onSelect?.(card);
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View
        style={[
          styles.stack,
          // Only the front card is full height; the rest contribute their peek.
          { height: cardHeight ? cardHeight + (stack.length - 1) * PEEK : 0 },
        ]}
      >
        {stack.map((card, index) => {
          const isFront = index === stack.length - 1;
          // The original position in the API's list, so a card keeps its colour
          // when the pile is rearranged.
          const finish = cards.findIndex((c) => c.id === card.id);

          return (
            <Animated.View
              key={card.id}
              style={[
                styles.card,
                {
                  height: cardHeight,
                  transform: [{ translateY: slideFor(card.id, index * PEEK) }],
                  // Not animated on purpose: the tapped card has to cross over
                  // the ones in front of it the instant it starts moving.
                  zIndex: index,
                  elevation: index,
                },
              ]}
            >
              <Pressable
                onPress={() => (isFront ? onPress?.() : bringToFront(card))}
              >
                <CreditCard card={card} finish={finish} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Text style={[styles.caption, { color: T.textFaint }]}>
        {stack.length > 1
          ? "Πάτα μια κάρτα για να έρθει μπροστά"
          : "Η κάρτα του λογαριασμού"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: "relative",
  },

  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  caption: {
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center",
    paddingTop: 10,
  },
});
