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
    maxHeight: "90%",
    backgroundColor: T.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },

  headerText: {
    flex: 1,
    gap: 2,
  },

  title: {
    color: T.text,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  subtitle: {
    color: T.textMuted,
    fontSize: 13,
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

  scroll: {
    padding: 20,
    paddingBottom: 32,
    gap: 10,
  },

  label: {
    color: T.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 6,
  },

  /* ---- night chips ---- */
  chips: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: T.radius.pill,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: "transparent",
  },

  chipActive: {
    backgroundColor: T.primarySoft,
    borderColor: T.primary,
  },

  chipText: {
    color: T.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },

  chipTextActive: {
    color: T.text,
  },

  /* ---- arrival slots ---- */
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  slot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: T.radius.sm,
    backgroundColor: T.surfaceAlt,
    borderWidth: 1,
    borderColor: "transparent",
  },

  slotActive: {
    backgroundColor: T.primarySoft,
    borderColor: T.primary,
  },

  slotText: {
    color: T.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },

  slotTextActive: {
    color: T.text,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: T.radius.sm,
    backgroundColor: T.surfaceAlt,
  },

  inlineInput: {
    flex: 1,
    color: T.text,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 12,
  },

  /* ---- party stepper ---- */
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: T.radius.sm,
    backgroundColor: T.surfaceAlt,
  },

  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: T.radius.sm,
    backgroundColor: T.elevated,
    alignItems: "center",
    justifyContent: "center",
  },

  stepperValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  stepperNumber: {
    color: T.text,
    fontSize: 20,
    fontWeight: "800",
    minWidth: 26,
    textAlign: "center",
  },

  hint: {
    color: T.warning,
    fontSize: 12.5,
    fontWeight: "600",
  },

  full: {
    color: T.danger,
    fontSize: 12.5,
    fontWeight: "700",
  },

  loader: {
    alignSelf: "flex-start",
  },

  /* ---- inputs ---- */
  input: {
    minHeight: 64,
    color: T.text,
    fontSize: 14,
    backgroundColor: T.surfaceAlt,
    borderRadius: T.radius.sm,
    padding: 12,
    textAlignVertical: "top",
  },

  inputSingle: {
    color: T.text,
    fontSize: 14,
    backgroundColor: T.surfaceAlt,
    borderRadius: T.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  privacy: {
    color: T.textFaint,
    fontSize: 11.5,
    marginTop: -4,
  },

  submit: {
    marginTop: 10,
  },

  /* ---- confirmation ---- */
  done: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 28,
    paddingVertical: 40,
  },

  doneIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,0.14)",
  },

  doneIconOk: {
    backgroundColor: "rgba(74,222,128,0.14)",
  },

  doneTitle: {
    color: T.text,
    fontSize: 20,
    fontWeight: "800",
  },

  doneText: {
    color: T.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 6,
  },
}));
