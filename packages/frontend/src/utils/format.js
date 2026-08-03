const DAYS_SHORT = ["Κυρ", "Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ"];
const MONTHS_SHORT = [
  "Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν",
  "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ",
];

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Whole days between today and the given date, ignoring clock time.
const daysFromToday = (date) =>
  Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);

// "Σήμερα" / "Αύριο" / "Παρ 8 Αυγ" — an event tonight should read as tonight.
export function formatEventDate(value) {
  if (!value) return "";

  const date = new Date(value);
  const diff = daysFromToday(date);

  if (diff === 0) return "Σήμερα";
  if (diff === 1) return "Αύριο";

  return `${DAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatFullDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${DAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

// "τώρα" / "12λ" / "4ω" / "3μ" — compact enough for a chat list row.
export function formatTimeAgo(value) {
  if (!value) return "";

  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return "τώρα";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}λ`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}ω`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}μ`;

  const date = new Date(value);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatClock(value) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatPrice(value) {
  if (!value) return "Δωρεάν";
  return `${value}€`;
}

export function priceLevel(level = 2) {
  return "€".repeat(Math.min(4, Math.max(1, level)));
}

export function formatDistance(km) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} μ` : `${km.toFixed(1)} χλμ`;
}

// openingHours is indexed from Monday, while getDay() starts on Sunday.
const toMondayIndex = (jsDay) => (jsDay + 6) % 7;

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Ranges that cross midnight ("22:00-04:00") belong to the day they started on,
// so a 01:30 check has to look at yesterday's row as well as today's.
export function isOpenNow(openingHours) {
  if (!Array.isArray(openingHours) || openingHours.length !== 7) return null;

  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = toMondayIndex(now.getDay());
  const yesterday = (today + 6) % 7;

  const covers = (range, minute) => {
    if (!range) return false;
    const [from, to] = range.split("-").map(toMinutes);
    return to > from
      ? minute >= from && minute < to
      : minute >= from || minute < to;
  };

  if (covers(openingHours[today], minutes)) return true;

  // Still inside last night's range.
  const lastNight = openingHours[yesterday];
  if (lastNight) {
    const [from, to] = lastNight.split("-").map(toMinutes);
    if (to <= from && minutes < to) return true;
  }

  return false;
}

export function todayHours(openingHours) {
  if (!Array.isArray(openingHours) || openingHours.length !== 7) return null;
  return openingHours[toMondayIndex(new Date().getDay())] ?? null;
}
