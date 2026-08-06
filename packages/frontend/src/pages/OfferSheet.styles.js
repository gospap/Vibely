import { makeStyles } from "@/styles/theme";

export default makeStyles((T) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  backdropTap: {
    flex: 1,
  },

  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },

  close: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    padding: 22,
    paddingTop: 26,
    paddingBottom: 32,
    gap: 10,
  },

  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radius.pill,
    backgroundColor: "rgba(74,222,128,0.14)",
  },

  badgeText: {
    color: T.accent,
    fontSize: 11.5,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  title: {
    color: T.text,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 31,
  },

  venue: {
    color: T.textMuted,
    fontSize: 14.5,
    fontWeight: "700",
  },

  detail: {
    color: T.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },

  facts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },

  fact: {
    color: T.textFaint,
    fontSize: 12.5,
    fontWeight: "600",
  },

  left: {
    color: T.warning,
    fontSize: 12.5,
    fontWeight: "800",
  },

  loader: {
    marginVertical: 13,
  },

  small: {
    color: T.textFaint,
    fontSize: 11.5,
    textAlign: "center",
  },

  /* ---- claimed ---- */
  done: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  doneIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,222,128,0.14)",
  },

  doneTitle: {
    color: T.text,
    fontSize: 20,
    fontWeight: "800",
  },

  code: {
    color: T.accent,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: 10,
    marginVertical: 4,
  },

  doneText: {
    color: T.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 6,
  },
}));
