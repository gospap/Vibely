const express = require("express");
const bcrypt = require("bcrypt");
const { getDb } = require("../../db");
const { normalizeText } = require("../utils/text");

const router = express.Router();

function buildUserPayload(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    type: user.type || "user",
    profileImageUrl: user.profileImageUrl || null,
    dateOfBirth: user.dateOfBirth || null,
    gender: user.gender || null,
    createdAt: user.createdAt || null,
  };
}

function getSafeUser(user) {
  const safe = { ...user };
  delete safe.password;
  delete safe.hashedpassword;
  safe.id = user._id.toString();
  return safe;
}

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    const users = getDb().collection("users");

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const doc = {
      username: name,
      // Lowercased, accent-stripped mirror of the username, written on every
      // path that sets a username. Search matches on this so both "NIKOS" and
      // "Ελενη" find their owners off an index, rather than needing a
      // case-insensitive regex scan over the whole collection.
      usernameLower: normalizeText(name),
      email,
      password: hashedPassword,
      type: "user",
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
      updatedAt: now,
    };

    const { insertedId } = await users.insertOne(doc);
    const user = { ...doc, _id: insertedId };

    req.session.user = buildUserPayload(user);
    res.status(201).json({ user: getSafeUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await getDb().collection("users").findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const storedPassword = user.password || user.hashedpassword;
    const isMatch = await bcrypt.compare(password, storedPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    req.session.user = buildUserPayload(user);
    res.status(200).json({ user: getSafeUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }

    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out" });
  });
});

module.exports = router;
