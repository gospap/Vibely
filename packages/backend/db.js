require("dotenv").config();
const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;

let client = null;
let dbInstance = null;

// Index declarations live here because there are no schemas to hang them on.
// Each entry is [keys, options]; createIndex is a no-op once it exists, so this
// is safe to run on every boot.
//
// Collection names match what the app already wrote, so existing data is picked
// up unchanged.
const INDEXES = {
  users: [
    [{ email: 1 }, { unique: true }],
    // Lowercased, accent-stripped copy of username. Search hits this so both
    // "NIKOS" and "Ελενη" find their owners off an index, rather than needing a
    // case-insensitive regex scan over the whole collection.
    [{ usernameLower: 1 }],
  ],

  events: [
    // The feed is always "upcoming, soonest first" — this index serves it.
    [{ startDate: 1 }],
    [{ musicGenre: 1, startDate: 1 }],
  ],

  stores: [[{ category: 1 }], [{ owner: 1 }]],

  reviews: [
    [{ store: 1 }],
    // One review per user per store — a second POST updates the existing one.
    [{ store: 1, author: 1 }, { unique: true }],
  ],

  reservations: [
    // The venue's night sheet: one equality match, already in arrival order.
    [{ store: 1, dateKey: 1, arrivalTime: 1 }],
    [{ user: 1, createdAt: -1 }],
    // One live booking per guest per venue per night. Partial, so a cancelled
    // or declined request does not stop them asking again for the same night.
    [
      { user: 1, store: 1, dateKey: 1 },
      {
        unique: true,
        partialFilterExpression: {
          status: { $in: ["pending", "confirmed"] },
        },
      },
    ],
  ],

  checkins: [
    // One stamp per guest per venue per night — the card counts visits, not
    // scans, so a second check-in the same night is a no-op.
    [{ user: 1, store: 1, dateKey: 1 }, { unique: true }],
    [{ store: 1, dateKey: 1 }],
  ],

  messages: [[{ conversationId: 1, createdAt: -1 }]],

  userpreferences: [[{ user: 1 }, { unique: true }]],
};

const ensureIndexes = async (db) => {
  await Promise.all(
    Object.entries(INDEXES).flatMap(([collection, indexes]) =>
      indexes.map(([keys, options]) =>
        db.collection(collection).createIndex(keys, options),
      ),
    ),
  );
};

const connectDB = async () => {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env and add your connection string.",
    );
  }

  client = new MongoClient(MONGODB_URI);
  await client.connect();

  // The database named in the connection string, or the driver default.
  dbInstance = client.db();

  await ensureIndexes(dbInstance);

  console.log("MongoDB connected");
  return dbInstance;
};

const getDb = () => {
  if (!dbInstance) {
    throw new Error("MongoDB not connected");
  }
  return dbInstance;
};

// The session store wants the client, not the database handle.
const getClient = () => {
  if (!client) {
    throw new Error("MongoDB not connected");
  }
  return client;
};

module.exports = {
  connectDB,
  getDb,
  getClient,
};
