// Dev helper: fill a venue's booking history so the analytics screen has
// something to draw.
//
// Spreads a month of reservations across the demo users with a believable mix
// of outcomes, and stamps a check-in for everyone who was seated. Wipes and
// rewrites its own data each run, so it is safe to repeat.
//
//   npm run demo:bookings
//
require("dotenv").config();
const bcrypt = require("bcrypt");
const { connectDB, getDb, getClient } = require("../db");
const { toDateKey, todayKey } = require("../src/utils/query");
const { normalizeText } = require("../src/utils/text");

// The audience breakdown in analytics stays hidden below five guests. Pass
// --guests to top the demo roster back up (password "demo1234"); without it the
// script only uses whoever already exists, so it never resurrects accounts you
// deleted on purpose.
const DEMO_GUESTS = [
  ["Nikos", "male", "1998-04-18", ["Techno", "Melodic Techno"]],
  ["Eleni", "female", "2001-11-02", ["House", "Disco / Funk"]],
  ["Sofia", "female", "1996-02-09", ["Deep House", "Jazz"]],
  ["Giannis", "male", "1999-05-30", ["Drum & Bass", "Electronica"]],
  ["Katerina", "female", "2003-09-14", ["Ελληνικά", "Έντεχνο"]],
  ["Marios", "male", "1995-07-25", ["Rock", "Live / Indie"]],
  ["Dimitris", "male", "2000-12-01", ["Afro House"]],
  ["Anna", "female", "1997-03-22", ["Lo-Fi / Chill", "House"]],
];

const NIGHTS_BACK = 30;
const SLOTS = ["22:00", "23:00", "00:00", "01:00"];
const NOTES = [
  "Γενέθλια",
  "Τραπέζι κοντά στο DJ booth",
  "Ερχόμαστε λίγο αργότερα",
  null,
  null,
];

// Roughly what a real book looks like: most tables honoured, a few no-shows,
// the occasional decline when the night was full.
const OUTCOMES = [
  ...Array(11).fill("seated"),
  ...Array(3).fill("confirmed"),
  ...Array(2).fill("no_show"),
  "declined",
  "cancelled",
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const between = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

const shiftKey = (key, days) => {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

(async () => {
  await connectDB();
  const db = getDb();

  const store = await db
    .collection("stores")
    .findOne({ "bookings.enabled": true });

  if (!store) {
    console.log("No store has bookings enabled — run the tenant setup first.");
    await getClient().close();
    return;
  }

  if (process.argv.includes("--guests")) {
    const password = await bcrypt.hash("demo1234", 10);
    const now = new Date();

    for (const [name, gender, dob, favouriteGenres] of DEMO_GUESTS) {
      await db.collection("users").updateOne(
        { email: `${name.toLowerCase()}@demo.vibely` },
        {
          $setOnInsert: {
            email: `${name.toLowerCase()}@demo.vibely`,
            username: name,
            usernameLower: normalizeText(name),
            password,
            type: "user",
            bio: null,
            dateOfBirth: new Date(dob),
            gender,
            profileImageUrl: null,
            favouriteGenres,
            friends: [],
            friendRequests: [],
            onGoingEvents: [],
            savedStores: [],
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      );
    }
    console.log("Topped the demo roster back up to 8 guests.\n");
  }

  const guests = await db
    .collection("users")
    .find({ email: /demo\.vibely$/ })
    .project({ username: 1 })
    .toArray();

  if (!guests.length) {
    console.log("No demo guests exist. Re-run with --guests to create them.");
    await getClient().close();
    return;
  }

  if (guests.length < 5) {
    console.log(
      `${guests.length} demo guests — analytics will show the privacy-withheld\n` +
        `state for the audience panel. Re-run with --guests to see the breakdown.\n`,
    );
  }

  // Clear what a previous run wrote, so numbers do not compound.
  const guestIds = guests.map((g) => g._id);
  await Promise.all([
    db
      .collection("reservations")
      .deleteMany({ store: store._id, user: { $in: guestIds } }),
    db
      .collection("checkins")
      .deleteMany({ store: store._id, user: { $in: guestIds } }),
  ]);

  const today = todayKey();
  const reservations = [];
  const checkIns = [];

  for (let back = NIGHTS_BACK; back >= 1; back -= 1) {
    const dateKey = shiftKey(today, -back);

    // Weekends get a real crowd, weekdays barely anything — otherwise the
    // "busiest nights" chart is a flat line.
    const weekday = new Date(`${dateKey}T00:00:00`).getDay();
    const isWeekend = weekday === 5 || weekday === 6;
    const tables = isWeekend ? between(2, 5) : between(0, 2);

    // One booking per guest per night is all the unique index allows.
    const tonightsGuests = [...guests]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(tables, guests.length));

    for (const guest of tonightsGuests) {
      const status = pick(OUTCOMES);
      const partySize = between(2, 6);
      const arrivalTime = pick(SLOTS);
      const bookedAt = new Date(`${dateKey}T12:00:00`);

      // The stamp is earned when they walk in, not when they booked. Anything
      // past midnight belongs to the next calendar day even though it is still
      // the same night — otherwise the flow chart has a hole at 00:00.
      const [arriveHour] = arrivalTime.split(":").map(Number);
      const arrivedAt = new Date(`${dateKey}T00:00:00`);
      if (arriveHour < 6) arrivedAt.setDate(arrivedAt.getDate() + 1);
      arrivedAt.setHours(arriveHour, between(0, 55), 0, 0);

      reservations.push({
        store: store._id,
        user: guest._id,
        event: null,
        dateKey,
        arrivalTime,
        partySize,
        status,
        note: pick(NOTES),
        contactName: guest.username,
        contactPhone: `69${between(10000000, 99999999)}`,
        tableLabel: status === "declined" ? null : String(between(1, 12)),
        responseNote: null,
        respondedAt: status === "pending" ? null : bookedAt,
        respondedBy: store.owner ?? null,
        createdAt: bookedAt,
        updatedAt: bookedAt,
      });

      // Being seated is what earns the stamp — same rule the app enforces.
      if (status === "seated") {
        checkIns.push({
          user: guest._id,
          store: store._id,
          dateKey,
          source: "reservation",
          reservation: null,
          createdAt: arrivedAt,
        });
      }
    }
  }

  // A couple of live requests waiting on the venue, so the queue is not empty.
  for (const guest of guests.slice(0, 3)) {
    const dateKey = shiftKey(today, between(1, 6));
    reservations.push({
      store: store._id,
      user: guest._id,
      event: null,
      dateKey,
      arrivalTime: pick(SLOTS),
      partySize: between(2, 6),
      status: "pending",
      note: pick(NOTES),
      contactName: guest.username,
      contactPhone: `69${between(10000000, 99999999)}`,
      tableLabel: null,
      responseNote: null,
      respondedAt: null,
      respondedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db.collection("reservations").insertMany(reservations);
  if (checkIns.length) await db.collection("checkins").insertMany(checkIns);

  const tally = reservations.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n${store.name} — ${NIGHTS_BACK} nights of history:\n`);
  for (const [status, n] of Object.entries(tally)) {
    console.log(`  ${status.padEnd(10)} ${n}`);
  }
  console.log(`  check-ins  ${checkIns.length}`);
  console.log(
    `\nOpen Μαγαζί → the chart icon to see it, and Κρατήσεις → Σε αναμονή for the queue.\n`,
  );

  await getClient().close();
})().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
