const express = require("express");
const { getDb } = require("../../db");
const router = express.Router();

// Get all stores
router.get("/stores", async (req, res) => {
  try {
    const db = await getDb();
    const stores = await db.collection("stores").find().toArray();
    res.json(stores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
