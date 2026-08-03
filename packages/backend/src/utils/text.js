// Lowercase and strip accents, so "βαλαωριτου" matches "Βαλαωρίτου" and
// "eleni" matches "Ελένη"'s latin spelling. NFD splits a letter from its tonos,
// then the combining-marks range drops the mark.
//
// This exists because MongoDB's $regex ignores collation, so accent-insensitive
// search has to run against strings that were normalised on the way in.
const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

module.exports = { normalizeText };
