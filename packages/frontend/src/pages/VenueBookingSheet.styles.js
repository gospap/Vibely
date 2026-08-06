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

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },

  headerText: {
    flex: 1,
    gap: 4,
  },

  name: {
    color: T.text,
    fontSize: 17,
    fontWeight: "800",
  },

  facts: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  factRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  fact: {
    color: T.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
  },

  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    padding: 18,
    paddingBottom: 30,
    gap: 8,
  },

  phone: {
    color: T.primary,
    fontSize: 14.5,
    fontWeight: "700",
  },

  note: {
    color: T.textMuted,
    fontSize: 13.5,
    fontStyle: "italic",
    lineHeight: 19,
  },

  label: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 6,
  },

  input: {
    color: T.text,
    fontSize: 14,
    backgroundColor: T.surfaceAlt,
    borderRadius: T.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  action: {
    flex: 1,
  },
}));
