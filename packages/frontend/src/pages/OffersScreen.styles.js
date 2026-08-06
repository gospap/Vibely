import { makeStyles, TAB_BAR_SPACE } from "@/styles/theme";

export default makeStyles((T) => ({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  back: {
    width: 30,
    height: 34,
    marginLeft: -8,
    alignItems: "center",
    justifyContent: "center",
  },

  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.5,
  },

  count: {
    color: T.accent,
    fontSize: 12.5,
    fontWeight: "700",
  },

  loader: {
    marginTop: 50,
  },

  list: {
    paddingBottom: TAB_BAR_SPACE,
  },

  /* ---- one offer: the same short full-width row as the events feed ---- */
  row: {
    flexDirection: "row",
    height: 78,
    backgroundColor: T.surface,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },

  image: {
    width: 78,
    height: 78,
    backgroundColor: T.surfaceAlt,
  },

  body: {
    flex: 1,
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 11,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  title: {
    flex: 1,
    color: T.text,
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  venue: {
    color: T.textFaint,
    fontSize: 11.5,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  meta: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },

  left: {
    color: T.warning,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },
}));
