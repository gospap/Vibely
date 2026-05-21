const express = require("express");
const { User } = require("../../models");
const router = express.Router();
const bcrypt = require("bcrypt");

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
  const safe = user.toObject ? user.toObject() : { ...user };
  delete safe.password;
  delete safe.hashedpassword;
  delete safe.__v;
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

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username: name,
      email,
      password: hashedPassword,
    });

    await user.save();

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

    const user = await User.findOne({ email });
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
