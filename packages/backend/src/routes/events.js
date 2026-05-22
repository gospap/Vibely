const express = require("express");
const router = express.Router();
const { getDb } = require("../../db");
// Get all events
router.get("/", async (req, res) => {
  try {
    const db = getDb();

    // 1. events
    const events = await db.collection("events").find({}).toArray();

    // 2. store ids
    const storeIds = events.map((e) => e.hostedBy);

    // 3. stores
    const stores = await db
      .collection("stores")
      .find({ _id: { $in: storeIds } })
      .toArray();

    // 4. merge
    const result = events.map((event) => {
      const store = stores.find(
        (s) => s._id.toString() === event.hostedBy.toString(),
      );

      return {
        ...event,
        store: {
          _id: store?._id,
          name: store?.name,
          image: store?.images?.[0], // 👈 ΕΔΩ η φωτογραφία που θες
        },
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = await getDb();

    const { title, description, startDate, endDate, hostedBy } = req.body;

    if (!title || !startDate) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const event = {
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      hostedBy,
      attendants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("events").insertOne(event);

    res.status(201).json({
      ...event,
      _id: result.insertedId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
