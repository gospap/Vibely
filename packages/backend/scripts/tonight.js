// Dev helper: make the app look like a busy Saturday right now.
//
// Rolls a few real events onto tonight and puts their venues live on the map,
// so the "Απόψε" feed and the live badges have something to show. Nothing here
// is app behaviour — re-run it whenever you want the demo state fresh.
//
//   npm run demo:tonight
//
require("dotenv").config();
const { connectDB, getDb, getClient } = require("../db");
const { currentNightKey } = require("../src/utils/query");

// How many events to pull onto tonight, and the crowd levels to spread around.
const EVENT_COUNT = 3;
const CROWD = ["packed", "busy", "filling", "quiet"];

// Arrival times that read like a real night out.
const START_HOURS = ["22:00", "23:00", "23:30"];

const at = (dateKey, hours, minutes = 0, dayOffset = 0) => {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

(async () => {
  await connectDB();
  const db = getDb();

  const nightKey = currentNightKey();

  // Prefer the venue you test bookings against, then fill up with others.
  const preferred = await db
    .collection("stores")
    .findOne({ "bookings.enabled": true });

  const events = await db
    .collection("events")
    .find({ hostedBy: { $ne: null } })
    .limit(EVENT_COUNT * 3)
    .toArray();

  if (!events.length) {
    console.log("No events with a host store — nothing to roll.");
    await getClient().close();
    return;
  }

  // One event per venue, so the feed does not show the same bar three times.
  const chosen = [];
  const seenHosts = new Set();

  if (preferred) {
    let atPreferred = events.find(
      (e) => e.hostedBy.toString() === preferred._id.toString(),
    );

    // The bookings-enabled venue is the one you test "κράτηση from an event"
    // against, so give it a night of its own if it has never hosted anything.
    if (!atPreferred) {
      const now = new Date();
      const doc = {
        title: `${preferred.name}: Saturday Session`,
        description: "Demo event, created by scripts/tonight.js.",
        musicGenre: "Melodic Techno",
        lineup: ["DJ Demo"],
        ticketPrice: 0,
        capacity: 200,
        hostedBy: preferred._id,
        images: preferred.images ?? [],
        attendants: [],
        searchText: "saturday session demo dj",
        createdAt: now,
        updatedAt: now,
      };

      const { insertedId } = await db.collection("events").insertOne(doc);
      atPreferred = { ...doc, _id: insertedId };
      console.log(`Created a demo event at ${preferred.name}.\n`);
    }

    chosen.push(atPreferred);
    seenHosts.add(preferred._id.toString());
  }

  for (const event of events) {
    if (chosen.length >= EVENT_COUNT) break;
    const host = event.hostedBy.toString();
    if (seenHosts.has(host)) continue;
    chosen.push(event);
    seenHosts.add(host);
  }

  console.log(`Rolling ${chosen.length} events onto the night of ${nightKey}:\n`);

  for (const [index, event] of chosen.entries()) {
    const startHour = START_HOURS[index % START_HOURS.length];
    const [h, m] = startHour.split(":").map(Number);

    await db.collection("events").updateOne(
      { _id: event._id },
      {
        $set: {
          startDate: at(nightKey, h, m),
          // Ends at 04:00 the next morning, so it also counts as "already
          // running" if you are looking at this after midnight.
          endDate: at(nightKey, 4, 0, 1),
          startHour,
          endHour: "04:00",
          updatedAt: new Date(),
        },
      },
    );

    const store = await db
      .collection("stores")
      .findOne({ _id: event.hostedBy }, { projection: { name: 1 } });

    console.log(`  ${startHour}  ${event.title}  @ ${store?.name}`);
  }

  // Put the hosts (and a couple of extra venues) live on the map.
  const hostIds = chosen.map((e) => e.hostedBy);
  const extras = await db
    .collection("stores")
    .find({ _id: { $nin: hostIds } })
    .limit(4)
    .toArray();

  const liveStores = [
    ...(await db.collection("stores").find({ _id: { $in: hostIds } }).toArray()),
    ...extras,
  ];

  console.log("\nLive on the map tonight:\n");

  for (const [index, store] of liveStores.entries()) {
    const crowd = CROWD[index % CROWD.length];
    const waitMinutes = crowd === "packed" ? 20 : crowd === "busy" ? 10 : 0;

    await db.collection("stores").updateOne(
      { _id: store._id },
      {
        $set: {
          live: {
            dateKey: nightKey,
            crowd,
            waitMinutes,
            note: crowd === "packed" ? "Ουρά στην πόρτα" : null,
            updatedAt: new Date(),
          },
        },
      },
    );

    console.log(
      `  ${store.name.padEnd(24)} ${crowd}${waitMinutes ? ` · ${waitMinutes}′ αναμονή` : ""}`,
    );
  }

  // --- activity through the night, so the flow view has a shape ---
  //
  // Each kind of venue fills at its own hour: coffee early, bars at eleven,
  // clubs at two. That curve is the whole point of the flow animation, so it
  // has to be seeded rather than left to chance.
  const PEAK_HOURS = {
    cafe: [19, 20, 21],
    beach: [19, 20, 21],
    rooftop: [20, 21, 22],
    live: [22, 23, 0],
    bar: [22, 23, 0, 1],
    club: [0, 1, 2, 3],
  };

  const guests = await db
    .collection("users")
    .find({ email: /demo\.vibely$/ })
    .project({ _id: 1 })
    .toArray();

  if (!guests.length) {
    console.log("\nNo demo guests, so no crowd to seed. Run demo:bookings --guests first.\n");
    await getClient().close();
    return;
  }

  const allStores = await db
    .collection("stores")
    .find({})
    .project({ name: 1, category: 1 })
    .toArray();

  await db.collection("checkins").deleteMany({
    dateKey: nightKey,
    user: { $in: guests.map((g) => g._id) },
  });

  const checkIns = [];

  for (const store of allStores) {
    const hours = PEAK_HOURS[store.category] ?? PEAK_HOURS.bar;

    // One check-in per guest per venue is all the unique index allows, so the
    // crowd size is capped by how many demo guests exist.
    for (const guest of guests) {
      if (Math.random() > 0.55) continue;

      const hour = hours[Math.floor(Math.random() * hours.length)];
      const at = new Date(`${nightKey}T00:00:00`);
      if (hour < 6) at.setDate(at.getDate() + 1);
      at.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

      checkIns.push({
        user: guest._id,
        store: store._id,
        dateKey: nightKey,
        source: "code",
        reservation: null,
        createdAt: at,
      });
    }
  }

  if (checkIns.length) await db.collection("checkins").insertMany(checkIns);

  console.log(`\nCrowd seeded: ${checkIns.length} check-ins across the night.`);
  console.log(
    `\nDone. The Απόψε chip, the live badges and η ροή της βραδιάς now have data.\n` +
      `Re-run this tomorrow — "tonight" moves, the data does not.\n`,
  );

  await getClient().close();
})().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
