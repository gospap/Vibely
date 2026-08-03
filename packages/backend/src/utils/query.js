// Shared helpers for the route handlers.

// User input goes straight into RegExp for the search bars — escape it so a
// stray "(" or "*" is matched literally instead of blowing up the query.
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const { normalizeText } = require("./text");

// Query params arrive as strings; anything non-numeric becomes null so callers
// can fall back to a default with ??.
const parseNumber = (value) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Great-circle distance in km between two {lat, lng} points.
const haversineKm = (a, b) => {
  const toRad = (x) => (x * Math.PI) / 180;

  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

// page/limit with sane bounds, so ?limit=999999 cannot dump the collection.
const paginate = (query, { defaultLimit = 10, maxLimit = 50 } = {}) => {
  const page = Math.max(1, parseNumber(query.page) ?? 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseNumber(query.limit) ?? defaultLimit),
  );
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = {
  escapeRegex,
  normalizeText,
  parseNumber,
  haversineKm,
  paginate,
};
