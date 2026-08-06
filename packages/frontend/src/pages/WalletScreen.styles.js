import { makeStyles, TAB_BAR_SPACE } from "@/styles/theme";

// A card is always full height. Stacked, the card in front covers all but the
// top strip of the one behind it — which is why nothing has to be resized when
// a pass is lifted out, only moved.
export const CARD_HEIGHT = 404;
export const PEEK = 86;

export default makeStyles((T) => ({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  back: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    color: T.text,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  headerCount: {
    color: T.accent,
    fontSize: 12,
    fontWeight: "800",
    paddingRight: 8,
  },

  loader: {
    marginTop: 60,
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: TAB_BAR_SPACE,
  },

  stack: {
    position: "relative",
  },

  /* ---- the pass itself ---- */
  card: {
    position: "absolute",
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    borderRadius: T.radius.lg,
    // Clips the gradient to the rounded corners on Android, where a child
    // background ignores the parent's radius otherwise.
    overflow: "hidden",
    // Without a shadow the cards read as one flat block instead of a stack.
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -2 },
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  cardFill: {
    flex: 1,
  },

  cardPress: {
    flex: 1,
  },

  /* ---- the strip that stays visible in the stack ---- */
  strip: {
    height: PEEK,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 14,
  },

  stripImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  stripText: {
    flex: 1,
    gap: 2,
  },

  stripVenue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  stripTitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12.5,
    fontWeight: "600",
  },

  stripCode: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: T.radius.sm,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  stripCodeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  stripExpired: {
    color: T.textFaint,
    fontSize: 12,
    fontWeight: "700",
  },

  /* ---- everything below the strip: only on screen once lifted ---- */
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  plate: {
    padding: 13,
    borderRadius: T.radius.md,
    backgroundColor: "#fff",
  },

  code: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 8,
    marginTop: 6,
  },

  hint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 16,
  },

  /* ---- what replaces the QR the instant the door scans it ---- */
  verified: {
    width: 194,
    height: 194,
    borderRadius: T.radius.md,
    backgroundColor: "rgba(74,222,128,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  verifiedText: {
    color: T.accent,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  close: {
    position: "absolute",
    top: 13,
    right: 13,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
}));
