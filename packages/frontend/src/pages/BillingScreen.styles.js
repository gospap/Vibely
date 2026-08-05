import { StyleSheet } from "react-native";
import { T, TAB_BAR_SPACE } from "@/styles/theme";

export default StyleSheet.create({
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
    color: T.text,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  loader: {
    marginTop: 60,
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: TAB_BAR_SPACE,
    gap: 12,
  },

  note: {
    color: T.textFaint,
    fontSize: 12.5,
    lineHeight: 18,
  },

  /* ---- one venue ---- */
  card: {
    gap: 12,
    padding: 14,
    borderRadius: T.radius.md,
    backgroundColor: T.surface,
  },

  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  image: {
    width: 40,
    height: 40,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
  },

  venue: {
    flex: 1,
    color: T.text,
    fontSize: 16,
    fontWeight: "800",
  },

  state: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    padding: 12,
    borderRadius: T.radius.sm,
  },

  stateText: {
    flex: 1,
    gap: 3,
  },

  stateTitle: {
    fontSize: 14,
    fontWeight: "800",
  },

  stateDetail: {
    color: T.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
  },

  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 44,
    borderRadius: T.radius.sm,
  },

  actionPrimary: {
    backgroundColor: T.primary,
  },

  actionSecondary: {
    backgroundColor: T.elevated,
  },

  actionText: {
    color: T.text,
    fontSize: 14,
    fontWeight: "700",
  },

  /* ---- invoices ---- */
  invoices: {
    gap: 8,
    paddingTop: 6,
  },

  sectionTitle: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  invoice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: T.radius.sm,
    backgroundColor: T.surface,
  },

  invoiceDate: {
    flex: 1,
    color: T.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  invoiceAmount: {
    color: T.text,
    fontSize: 13.5,
    fontWeight: "800",
  },

  footnote: {
    color: T.textFaint,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingTop: 6,
  },
});
