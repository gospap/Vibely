import { StyleSheet } from "react-native";

export default StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },

  wrapper: {
    justifyContent: "center",
    alignItems: "center",
  },

  triangle: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },

  cometWrapper: {
    position: "absolute",
    justifyContent: "flex-start",
    alignItems: "center",
  },

  comet: {
    width: 2,
    borderRadius: 2,
  },
});
