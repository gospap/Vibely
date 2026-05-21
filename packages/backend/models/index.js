const mongoose = require("mongoose");

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
    dateOfBirth: Date,

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    profileImageUrl: String,

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    friendRequests: [
      {
        from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
      },
    ],

    onGoingEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
  },
  { timestamps: true },
);

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

    attendants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    hostedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },

    description: String,

    images: [String],
  },
  { timestamps: true },
);

/* =========================
   STORE (MAP PINS)
========================= */
const storeSchema = new mongoose.Schema(
  {
    name: String,
    description: String,

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

/* =========================
   USER PREFERENCES
========================= */
const userPreferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "dark",
    },

    notifications: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
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

    text: String,
    imageUrl: String,

    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/* =========================
   EXPORT MODELS
========================= */

const User = mongoose.model("User", userSchema);
const Event = mongoose.model("Event", eventSchema);
const Store = mongoose.model("Store", storeSchema);
const UserPreference = mongoose.model("UserPreference", userPreferenceSchema);
const Message = mongoose.model("Message", messageSchema);

module.exports = {
  User,
  Event,
  Store,
  UserPreference,
  Message,
};
