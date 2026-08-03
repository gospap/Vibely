const express = require("express");
const mongoose = require("mongoose");
const { Store, Review, Event, User } = require("../../models");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { normalizeText, haversineKm, parseNumber } = require("../utils/query");

const router = express.Router();

const badId = (res) => res.status(400).json({ message: "Invalid store id" });

/* =========================
   GET /stores
   Map feed. Supports ?q= ?category= and ?lat=&lng= for distance sorting.
========================= */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { q, category } = req.query;

    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    let stores = await Store.find(filter).lean();

    // Matching happens here rather than in mongo because a Greek search has to
    // ignore accents ("βαλαωριτου" -> "Βαλαωρίτου") and $regex cannot. The map
    // loads every pin anyway, so there is nothing extra to fetch.
    if (q) {
      const needle = normalizeText(q);
      stores = stores.filter((store) =>
        normalizeText(
          [store.name, store.area, store.address, ...(store.tags || [])].join(" "),
        ).includes(needle),
      );
    }

    const lat = parseNumber(req.query.lat);
    const lng = parseNumber(req.query.lng);

    if (lat != null && lng != null) {
      const from = { lat, lng };
      for (const store of stores) {
        store.distanceKm = store.location
          ? haversineKm(from, store.location)
          : null;
      }
      stores.sort(
        (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      );

      const radiusKm = parseNumber(req.query.radiusKm);
      if (radiusKm != null) {
        return res.json(
          stores.filter((s) => s.distanceKm != null && s.distanceKm <= radiusKm),
        );
      }
    }

    res.json(stores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /stores/:id
   Detail sheet: store + latest reviews + this user's own review.
========================= */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const store = await Store.findById(id).lean();
    if (!store) return res.status(404).json({ message: "Store not found" });

    const [reviews, upcomingCount, myReview] = await Promise.all([
      Review.find({ store: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("author", "username profileImageUrl")
        .lean(),
      Event.countDocuments({ hostedBy: id, startDate: { $gte: new Date() } }),
      req.userId
        ? Review.findOne({ store: id, author: req.userId }).lean()
        : null,
    ]);

    // Star histogram for the rating breakdown bars in the sheet.
    const breakdown = await Review.aggregate([
      { $match: { store: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]);

    const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of breakdown) histogram[row._id] = row.count;

    let saved = false;
    if (req.userId) {
      saved = await User.exists({ _id: req.userId, savedStores: id }).then(
        Boolean,
      );
    }

    res.json({ ...store, reviews, upcomingCount, myReview, histogram, saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /stores/:id/events
========================= */
router.get("/:id/events", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const events = await Event.find({
      hostedBy: id,
      startDate: { $gte: new Date() },
    })
      .sort({ startDate: 1 })
      .limit(20)
      .lean();

    res.json(events.map((e) => ({ ...e, attendantCount: e.attendants?.length ?? 0 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /stores/:id/reviews  (paginated)
========================= */
router.get("/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const page = Math.max(1, parseNumber(req.query.page) ?? 1);
    const limit = Math.min(50, Math.max(1, parseNumber(req.query.limit) ?? 10));

    const [items, total] = await Promise.all([
      Review.find({ store: id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("author", "username profileImageUrl")
        .lean(),
      Review.countDocuments({ store: id }),
    ]);

    res.json({ items, page, limit, total, hasMore: page * limit < total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /stores/:id/reviews
   Upsert (one review per user) then recompute the cached average.
========================= */
router.post("/:id/reviews", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const rating = parseNumber(req.body.rating);
    if (rating == null || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const store = await Store.findById(id).select("_id");
    if (!store) return res.status(404).json({ message: "Store not found" });

    await Review.findOneAndUpdate(
      { store: id, author: req.userId },
      { $set: { rating, comment: req.body.comment || "" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await recomputeRating(id);

    const updated = await Store.findById(id).select("ratings").lean();
    const review = await Review.findOne({ store: id, author: req.userId })
      .populate("author", "username profileImageUrl")
      .lean();

    res.status(201).json({ review, ratings: updated.ratings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   DELETE /stores/:id/reviews  (remove my own)
========================= */
router.delete("/:id/reviews", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    await Review.deleteOne({ store: id, author: req.userId });
    await recomputeRating(id);

    const updated = await Store.findById(id).select("ratings").lean();
    res.json({ ratings: updated?.ratings ?? { average: 0, count: 0 } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /stores/:id/save  (toggle bookmark)
========================= */
router.post("/:id/save", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const alreadySaved = await User.exists({
      _id: req.userId,
      savedStores: id,
    });

    await User.updateOne(
      { _id: req.userId },
      alreadySaved
        ? { $pull: { savedStores: id } }
        : { $addToSet: { savedStores: id } },
    );

    res.json({ saved: !alreadySaved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// The store carries a denormalised average so the map can render stars without
// touching the reviews collection. Recompute it whenever a review changes.
async function recomputeRating(storeId) {
  const [agg] = await Review.aggregate([
    { $match: { store: new mongoose.Types.ObjectId(storeId) } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  await Store.updateOne(
    { _id: storeId },
    {
      $set: {
        "ratings.average": agg ? Math.round(agg.average * 10) / 10 : 0,
        "ratings.count": agg ? agg.count : 0,
      },
    },
  );
}

module.exports = router;
