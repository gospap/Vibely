require("dotenv").config();
const bcrypt = require("bcrypt");
const connectDB = require("./db");
const { User, Store } = require("./models");

const stores = [
  {
    name: "Vibely Rooftop",
    description:
      "A rooftop lounge with live DJs, craft cocktails and panoramic city views.",
    location: { lat: 37.9842, lng: 23.7283 },
    images: [
      "https://images.unsplash.com/photo-1518599814594-3ac4dd6b7c47?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    ],
    ratings: { average: 4.8, count: 128 },
  },
  {
    name: "Pulse Bar",
    description:
      "Neon-lit urban bar with premium mixers, craft spirits and late-night energy.",
    location: { lat: 37.9766, lng: 23.7269 },
    images: [
      "https://images.unsplash.com/photo-1497032205916-ac775f0649ae?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=800&q=80",
    ],
    ratings: { average: 4.6, count: 96 },
  },
  {
    name: "Neon Lounge",
    description:
      "Modern hangout with cozy seating, specialty cocktails and playful lighting.",
    location: { lat: 37.9715, lng: 23.7257 },
    images: [
      "https://images.unsplash.com/photo-1558980394-0d86c08722e8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    ],
    ratings: { average: 4.7, count: 102 },
  },
  {
    name: "Studio 21",
    description:
      "Creative events space for meetups, workshops and small concerts.",
    location: { lat: 37.9743, lng: 23.7337 },
    images: [
      "https://images.unsplash.com/photo-1517520287167-4bbf64a00d66?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80",
    ],
    ratings: { average: 4.5, count: 74 },
  },
  {
    name: "Elysium Cafe",
    description:
      "Daytime chill cafe that turns into a mellow evening spot with chill beats.",
    location: { lat: 37.981, lng: 23.7402 },
    images: [
      "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?auto=format&fit=crop&w=800&q=80",
    ],
    ratings: { average: 4.4, count: 58 },
  },
];

async function seed() {
  await connectDB();

  console.log("Clearing old store data...");
  await Store.deleteMany({});

  console.log("Creating default owner user...");
  const ownerPassword = await bcrypt.hash("Vibely123!", 10);
  const owner = await User.create({
    email: "owner@vibely.local",
    password: ownerPassword,
    username: "vibely-owner",
  });

  const storeDocs = stores.map((store) => ({
    ...store,
    owner: owner._id,
  }));

  console.log("Seeding stores...");
  await Store.insertMany(storeDocs);

  console.log("Seed completed: created", storeDocs.length, "stores.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
