import { StyleSheet } from "react-native";
import { T } from "@/styles/theme";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  flex: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },

  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerName: {
    color: T.text,
    fontSize: 16,
    fontWeight: "700",
  },

  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },

  dayDivider: {
    alignSelf: "center",
    color: T.textFaint,
    fontSize: 11.5,
    marginVertical: 12,
  },

  bubbleRow: {
    flexDirection: "row",
    marginVertical: 1,
  },

  bubbleRowMine: {
    justifyContent: "flex-end",
  },

  bubbleRowTheirs: {
    justifyContent: "flex-start",
  },

  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 20,
  },

  bubbleMine: {
    backgroundColor: T.primary,
    borderBottomRightRadius: 6,
  },

  bubbleTheirs: {
    backgroundColor: T.surfaceAlt,
    borderBottomLeftRadius: 6,
  },

  bubblePhoto: {
    padding: 4,
    paddingBottom: 4,
  },

  photo: {
    width: 220,
    height: 220,
    borderRadius: 16,
    marginBottom: 4,
  },

  text: {
    color: T.text,
    fontSize: 15,
    lineHeight: 20,
  },

  textMine: {
    color: "#fff",
  },

  time: {
    color: T.textFaint,
    fontSize: 10.5,
    alignSelf: "flex-end",
    marginTop: 2,
    paddingHorizontal: 4,
  },

  timeMine: {
    color: "rgba(255,255,255,0.7)",
  },

  emptyThread: {
    color: T.textFaint,
    fontSize: 13.5,
    textAlign: "center",
    marginTop: 40,
    // The list is inverted, so its empty state renders upside down otherwise.
    transform: [{ scaleY: -1 }],
  },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.bg,
  },

  composerIcon: {
    height: 40,
    justifyContent: "center",
  },

  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    color: T.text,
    fontSize: 15,
    backgroundColor: T.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  sendButtonOff: {
    backgroundColor: T.elevated,
  },

  loader: {
    marginTop: 40,
  },

  moreLoader: {
    marginVertical: 12,
  },
});
