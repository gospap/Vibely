import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import Svg, { Polygon } from "react-native-svg";

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

export default function TriangleLoader({
  size = 80,
  color = "#222",
  cometColor = "#fff",
  overlay = false,
}) {
  const dashOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(dashOffset, {
        toValue: 100,
        duration: 1600,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const strokeDashoffset = dashOffset.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -100],
  });

  const loader = (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* STATIC TRIANGLE */}
      <Polygon
        points="30,6 54,50 6,50"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* MOVING COMET STROKE */}
      <AnimatedPolygon
        points="30,6 54,50 6,50"
        fill="none"
        stroke={cometColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="20 80"
        strokeDashoffset={strokeDashoffset}
      />
    </Svg>
  );

  if (overlay) {
    return <View style={styles.overlay}>{loader}</View>;
  }

  return loader;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
});
