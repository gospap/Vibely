import { useState } from "react";
import { View, Image, ScrollView, StyleSheet } from "react-native";
import { makeStyles, useStyles, useTheme } from "@/styles/theme";

// Paged horizontal scroller with dots. Falls back to a flat placeholder when a
// store has no photos yet.
export default function PhotoCarousel({ images = [], height = 220, width }) {
  const T = useTheme();
  const styles = useStyles(styleSheet);
  const [index, setIndex] = useState(0);

  const photos = images.filter(Boolean);

  if (!photos.length) {
    return <View style={[styles.placeholder, { height }]} />;
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(page);
        }}
      >
        {photos.map((uri, i) => (
          <Image key={`${uri}-${i}`} source={{ uri }} style={{ width, height }} />
        ))}
      </ScrollView>

      {photos.length > 1 ? (
        <View style={styles.dots}>
          {photos.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styleSheet = makeStyles((T) => ({
  placeholder: {
    backgroundColor: T.surfaceAlt,
  },
  dots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: {
    backgroundColor: "#fff",
    width: 18,
  },
}));
