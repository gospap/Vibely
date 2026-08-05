// Dev helper: put an offer on for tonight across a spread of venues, so the
// Προσφορές page has something to show.
//
//   npm run demo:offers
//
// Clears whatever the previous run left, so numbers do not pile up.
require("dotenv").config();
const { ObjectId } = require("mongodb");
const { connectDB, getDb, getClient } = require("../db");
const { currentNightKey } = require("../src/utils/query");

// A real mix: free things, straight discounts, and the timed ones that exist to
// fill a quiet early evening.
const OFFERS = [
  { title: "Δωρεάν ποτό στην πρώτη παραγγελία", until: "23:00", limit: 20 },
  { title: "−20% σε όλα τα cocktails", until: "01:00", limit: null },
  { title: "2 μπύρες στην τιμή της μίας", until: "22:30", limit: 30 },
  { title: "Happy hour: −30% μέχρι τις 21:00", until: "21:00", limit: null },
  { title: "Δωρεάν σφηνάκι με κάθε τραπέζι", until: "02:00", limit: 15 },
  { title: "Καφές 2€ όλη μέρα", until: "20:00", limit: null },
  { title: "−15% στο φαγητό", until: "00:00", limit: 25 },
  { title: "Δωρεάν είσοδος μέχρι τη 1", until: "01:00", limit: 40 },
  { title: "Μισή τιμή σε όλα τα σφηνάκια", until: "23:30", limit: null },
  { title: "Κερασμένο brunch με κάθε καφέ", until: "19:00", limit: 12 },
];

// "01:00" tonight means 01:00 tomorrow — the night has already rolled over.
const expiryFor = (until, nightKey) => {
  const [hours, minutes] = until.split(":").map(Number);
  const at = new Date(`${nightKey}T00:00:00`);
  if (hours < 6) at.setDate(at.getDate() + 1);
  at.setHours(hours, minutes, 0, 0);
  return at;
};

(async () => {
  await connectDB();
  const db = getDb();
  const nightKey = currentNightKey();
  const now = new Date();

  const stores = await db
    .collection("stores")
    .find({})
    .project({ name: 1 })
    .limit(OFFERS.length)
    .toArray();

  if (!stores.length) {
    console.log("No venues to put offers on.");
    await getClient().close();
    return;
  }

  await db
    .collection("stores")
    .updateMany({ offer: { $exists: true } }, { $unset: { offer: "" } });
  await db.collection("offerclaims").deleteMany({});

  console.log(`\nOffers on for the night of ${nightKey}:\n`);

  let live = 0;

  for (const [index, store] of stores.entries()) {
    const offer = OFFERS[index % OFFERS.length];
    const expiresAt = expiryFor(offer.until, nightKey);

    // An offer whose hour has already gone by tonight would be invisible, so
    // it is skipped rather than written and silently filtered out later.
    if (expiresAt <= now) {
      console.log(
        `  ${store.name.padEnd(24)} skipped — ${offer.until} has passed`,
      );
      continue;
    }

    await db.collection("stores").updateOne(
      { _id: new ObjectId(store._id) },
      {
        $set: {
          offer: {
            id: new ObjectId(),
            dateKey: nightKey,
            title: offer.title,
            detail: null,
            until: offer.until,
            expiresAt,
            claimLimit: offer.limit,
            claimed: 0,
            createdAt: now,
          },
        },
      },
    );

    live += 1;
    console.log(
      `  ${store.name.padEnd(24)} ${offer.title} (έως ${offer.until})`,
    );
  }

  console.log(`\n${live} live offers. Open the Προσφορές tab.\n`);
  await getClient().close();
})().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
