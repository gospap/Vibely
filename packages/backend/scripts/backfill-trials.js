// One-off: give every venue that predates billing a 14-day trial.
//
// Without this they have no `subscription` at all, which entitlement() reads as
// "not paying" — and the whole map would go empty on the next deploy.
//
//   npm run backfill:trials
//
require("dotenv").config();
const { connectDB, getDb, getClient } = require("../db");
const { startTrial, TRIAL_DAYS } = require("../src/utils/trial");

(async () => {
  await connectDB();
  const stores = getDb().collection("stores");

  const missing = await stores
    .find({ subscription: { $exists: false } })
    .project({ name: 1 })
    .toArray();

  if (!missing.length) {
    console.log("Every venue already has a subscription record.");
    await getClient().close();
    return;
  }

  const trial = startTrial();

  await stores.updateMany(
    { subscription: { $exists: false } },
    { $set: { subscription: trial } },
  );

  console.log(
    `\nStarted a ${TRIAL_DAYS}-day trial on ${missing.length} venues, ending ${trial.trialEndsAt.toISOString().slice(0, 10)}:\n`,
  );
  for (const store of missing) console.log(`  ${store.name}`);
  console.log("");

  await getClient().close();
})().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
