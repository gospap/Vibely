// Dev helper: add Salt Sea Bar (Ierissos, Halkidiki) as a bookable venue with
// its own tenant account, pinned permanently live.
//
//   npm run demo:salt
//
// Details are the real ones (coordinates, address, phone, hours). The photos
// are NOT — see IMAGES below.
//
require("dotenv").config();
const bcrypt = require("bcrypt");
const { connectDB, getDb, getClient } = require("../db");
const { normalizeText } = require("../src/utils/text");
const { startTrial } = require("../src/utils/trial");

const OWNER = {
  email: "thomas@salt.gr",
  username: "Thomas",
  password: "password",
};

// Stand-ins, not the venue's own photos. Salt Sea Bar's real pictures live on
// Tripadvisor and Facebook, which both block hotlinking and scraping, and they
// are the business's copyright either way. These are Unsplash, free to use.
// Swap them for the owner's own uploads before this listing is ever public.
const IMAGES = [
  "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=1400&q=80",
  "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1400&q=80",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1400&q=80",
  "https://images.unsplash.com/photo-1502301197179-65228ab57f78?w=1400&q=80",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&q=80",
];

(async () => {
  await connectDB();
  const db = getDb();
  const now = new Date();

  // --- owner account ---
  await db.collection("users").updateOne(
    { email: OWNER.email },
    {
      $set: {
        username: OWNER.username,
        usernameLower: normalizeText(OWNER.username),
        password: await bcrypt.hash(OWNER.password, 10),
        type: "tenant",
        updatedAt: now,
      },
      $setOnInsert: {
        email: OWNER.email,
        bio: null,
        dateOfBirth: null,
        gender: null,
        profileImageUrl: null,
        favouriteGenres: [],
        friends: [],
        friendRequests: [],
        onGoingEvents: [],
        savedStores: [],
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const owner = await db.collection("users").findOne({ email: OWNER.email });

  // --- the venue ---
  await db.collection("stores").updateOne(
    { name: "Salt Sea Bar" },
    {
      $set: {
        name: "Salt Sea Bar",
        description:
          "Beach bar πάνω στην παραλία της Ιερισσού. Καφές και brunch από νωρίς, " +
          "smoothies και σνακ όλη μέρα, πάνω από εκατό ετικέτες μπύρας και cocktails " +
          "μέχρι αργά, με το Άγιο Όρος απέναντι.",
        category: "beach",
        address: "Παραλία Ιερισσού",
        area: "Ιερισσός",
        phone: "+30 697 651 9192",
        instagram: null,
        priceLevel: 2,
        tags: ["beach bar", "brunch", "cocktails", "μπύρες", "θάλασσα"],

        // Index 0 is Monday. Open 07:00 through 03:00 every day.
        openingHours: Array(7).fill("07:00-03:00"),

        location: { lat: 40.4004749, lng: 23.8806352 },
        images: IMAGES,
        owner: owner._id,

        bookings: {
          enabled: true,
          maxPartySize: 10,
          slots: ["19:00", "20:00", "21:00", "22:00", "23:00"],
          capacityPerNight: 60,
          autoConfirm: false,
          horizonDays: 14,
        },

        loyalty: {
          enabled: true,
          stampsForReward: 6,
          rewardLabel: "Ένα cocktail κερασμένο",
        },

        // `always: true` pins this open-endedly, so the venue reads as live
        // whenever the app is opened rather than expiring at 06:00.
        live: {
          always: true,
          crowd: "busy",
          waitMinutes: 10,
          note: "Γεμάτο απόψε",
          updatedAt: now,
        },

        updatedAt: now,
      },
      $setOnInsert: {
        ratings: { average: 0, count: 0 },
        // A new venue starts its 14-day trial the moment it is created.
        subscription: startTrial(now),
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const store = await db.collection("stores").findOne({ name: "Salt Sea Bar" });

  console.log(`\nSalt Sea Bar added.\n`);
  console.log(`  id        ${store._id}`);
  console.log(`  where     ${store.location.lat}, ${store.location.lng}`);
  console.log(`  login     ${OWNER.email} / ${OWNER.password}`);
  console.log(`  bookings  ${store.bookings.slots.join(", ")} · cap ${store.bookings.capacityPerNight}`);
  console.log(`  loyalty   ${store.loyalty.stampsForReward} stamps → ${store.loyalty.rewardLabel}`);
  console.log(`  live      ${store.live.crowd}, pinned (always)\n`);
  console.log(`  Photos are Unsplash stand-ins, not the real venue's — see IMAGES.\n`);

  await getClient().close();
})().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
