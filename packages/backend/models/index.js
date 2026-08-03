const mongoose = require("mongoose");
const { normalizeText } = require("../src/utils/text");

/* =========================
   USER
========================= */
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    type: {
      type: String,
      enum: ["user", "tenant", "superadmin"],
      default: "user",
    },

    username: String,
    // Lowercased, accent-stripped copy of username. Search hits this so both
    // "NIKOS" and "Ελενη" find their owners off an index, rather than needing a
    // case-insensitive regex scan over the whole collection.
    usernameLower: { type: String, index: true },

    bio: String,
    dateOfBirth: Date,

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    profileImageUrl: String,

    favouriteGenres: [String],

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    friendRequests: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    onGoingEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],

    savedStores: [{ type: mongoose.Schema.Types.ObjectId, ref: "Store" }],
  },
  { timestamps: true },
);

// Keep the lowercase mirror in sync on every write path (save + findOneAndUpdate).
// Mongoose 9 middleware takes no `next` - returning is enough.
userSchema.pre("save", function () {
  if (this.isModified("username")) {
    this.usernameLower = normalizeText(this.username);
  }
});

userSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};
  const username = update.username ?? update.$set?.username;
  if (username != null) {
    update.$set = { ...update.$set, usernameLower: normalizeText(username) };
    this.setUpdate(update);
  }
});

/* =========================
   EVENT
========================= */
const eventSchema = new mongoose.Schema(
  {
    title: String,

    startDate: Date,
    endDate: Date,

    startHour: String,
    endHour: String,

    musicGenre: String,
    lineup: [String],

    ticketPrice: { type: Number, default: 0 },
    capacity: Number,

    attendants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    hostedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },

    description: String,

    images: [String],

    // Accent-stripped title + description + lineup, kept in sync below. The
    // feed is paginated in mongo, so search has to be a database filter and
    // cannot normalise in JS the way the (much smaller) store list does.
    searchText: String,
  },
  { timestamps: true },
);

eventSchema.pre("save", function () {
  if (
    this.isModified("title") ||
    this.isModified("description") ||
    this.isModified("lineup")
  ) {
    this.searchText = eventSearchText(this);
  }
});

// Also used by the seed, which goes through insertMany and so skips the hook.
const eventSearchText = (event) =>
  normalizeText(
    [event.title, event.description, ...(event.lineup || [])].join(" "),
  );

// The events feed is always "upcoming, soonest first" — this index serves it.
eventSchema.index({ startDate: 1 });
eventSchema.index({ musicGenre: 1, startDate: 1 });

/* =========================
   STORE (MAP PINS)
========================= */
const storeSchema = new mongoose.Schema(
  {
    name: String,
    description: String,

    category: {
      type: String,
      enum: ["bar", "club", "rooftop", "cafe", "live", "beach"],
      default: "bar",
    },

    address: String,
    area: String,
    phone: String,
    instagram: String,

    priceLevel: { type: Number, min: 1, max: 4, default: 2 },

    tags: [String],

    // "22:00-04:00" per weekday, index 0 = Monday. null means closed that day.
    openingHours: {
      type: [String],
      default: undefined,
    },

    location: {
      lat: Number,
      lng: Number,
    },

    images: [String],

    ratings: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

storeSchema.index({ category: 1 });

/* =========================
   REVIEW (STORE RATINGS)
========================= */
const reviewSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
  },
  { timestamps: true },
);

// One review per user per store — a second POST updates the existing one.
reviewSchema.index({ store: 1, author: 1 }, { unique: true });

/* =========================
   USER PREFERENCES
========================= */
const userPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      index: true,
    },

    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "dark",
    },

    language: {
      type: String,
      enum: ["el", "en"],
      default: "el",
    },

    // Kilometres. Used to filter the map / events feed around the user.
    searchRadiusKm: { type: Number, default: 5 },

    notifications: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      friendRequests: { type: Boolean, default: true },
      eventReminders: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
    },

    privacy: {
      showAttendance: { type: Boolean, default: true },
      discoverable: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

/* =========================
   MESSAGES (CHAT)
========================= */
const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Sorted "<idA>:<idB>" pair key. Lets a thread be fetched with one indexed
    // equality match instead of an $or over both directions.
    conversationId: { type: String, index: true },

    text: String,
    imageUrl: String,

    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

// Stable key for a pair of users, whichever way round they are passed.
const conversationKey = (a, b) =>
  [a.toString(), b.toString()].sort().join(":");

messageSchema.pre("save", function () {
  if (!this.conversationId && this.sender && this.receiver) {
    this.conversationId = conversationKey(this.sender, this.receiver);
  }
});

/* =========================
   EXPORT MODELS
========================= */

const User = mongoose.model("User", userSchema);
const Event = mongoose.model("Event", eventSchema);
const Store = mongoose.model("Store", storeSchema);
const Review = mongoose.model("Review", reviewSchema);
const UserPreference = mongoose.model("UserPreference", userPreferenceSchema);
const Message = mongoose.model("Message", messageSchema);

module.exports = {
  User,
  Event,
  Store,
  Review,
  UserPreference,
  Message,
  conversationKey,
  eventSearchText,
};
