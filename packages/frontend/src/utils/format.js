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

// Lowercase and strip accents, so "βαλαωριτου" matches "Βαλαωρίτου". Mirrors
// normalizeText on the server, for the lists that are filtered on the device
// instead of round-tripping a request per keystroke.
export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Nights travel to the API as "YYYY-MM-DD" rather than timestamps — see the
// Reservation model for why.
export function toDateKey(value) {
  const d = new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// A night runs past midnight, so before 06:00 the night that is *running* is
// still the one that began yesterday evening. Mirrors currentNightKey on the
// server; used for "what is happening right now", not for booking ahead —
// someone booking at 02:00 means the coming evening, which is today's key.
export function currentNightKey(now = new Date()) {
  const d = new Date(now);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

// The next `count` nights as keys, starting with today.
export function nextNights(count) {
  const nights = [];
  const d = new Date();

  for (let i = 0; i < count; i += 1) {
    nights.push(toDateKey(d));
    d.setDate(d.getDate() + 1);
  }

  return nights;
}

// "Απόψε" / "Αύριο" / "Σαβ 16 Αυγ" for a night key.
export function formatNightKey(key) {
  if (!key) return "";

  const date = new Date(`${key}T00:00:00`);
  const diff = daysFromToday(date);

  if (diff === 0) return "Απόψε";
  if (diff === 1) return "Αύριο";

  return `${DAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

// Narrower version for a row of chips: "Απόψε" / "Αύριο" / "Σαβ 16".
export function formatNightChip(key) {
  if (!key) return "";

  const date = new Date(`${key}T00:00:00`);
  const diff = daysFromToday(date);

  if (diff === 0) return "Απόψε";
  if (diff === 1) return "Αύριο";

  return `${DAYS_SHORT[date.getDay()]} ${date.getDate()}`;
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
