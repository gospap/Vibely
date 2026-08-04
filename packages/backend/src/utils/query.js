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

// A night is identified by a "YYYY-MM-DD" day key rather than a timestamp —
// see the Reservation model for why. These keep the format in one place.
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const isDateKey = (value) =>
  typeof value === "string" &&
  DATE_KEY.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00`));

const toDateKey = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const todayKey = () => toDateKey(new Date());

// Whole days from key a to key b. Both are read as local midnight, so a clock
// change between them cannot shift the answer by a day.
const daysBetweenKeys = (a, b) =>
  Math.round(
    (new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000,
  );

// A night runs from the evening into the small hours, so before 06:00 "tonight"
// is still the night that began yesterday evening. Someone browsing at 02:00
// wants the party they are standing in, not tomorrow's.
const NIGHT_ENDS_HOUR = 6;

const currentNightKey = (now = new Date()) => {
  const d = new Date(now);
  if (d.getHours() < NIGHT_ENDS_HOUR) d.setDate(d.getDate() - 1);
  return toDateKey(d);
};

// [18:00 on the night's own date, 06:00 the next morning].
const nightWindow = (dateKey) => {
  const from = new Date(`${dateKey}T18:00:00`);

  const to = new Date(`${dateKey}T00:00:00`);
  to.setDate(to.getDate() + 1);
  to.setHours(NIGHT_ENDS_HOUR, 0, 0, 0);

  return { from, to };
};

module.exports = {
  escapeRegex,
  normalizeText,
  parseNumber,
  haversineKm,
  paginate,
  isDateKey,
  toDateKey,
  todayKey,
  daysBetweenKeys,
  currentNightKey,
  nightWindow,
};
