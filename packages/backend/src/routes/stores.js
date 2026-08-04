const express = require("express");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const { getDb } = require("../../db");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const {
  normalizeText,
  haversineKm,
  parseNumber,
  isDateKey,
  toDateKey,
  todayKey,
  daysBetweenKeys,
  currentNightKey,
} = require("../utils/query");

const router = express.Router();

const badId = (res) => res.status(400).json({ message: "Invalid store id" });

const CROWD_LEVELS = ["quiet", "filling", "busy", "packed"];

// Statuses that hold a seat. A pending request has not been given a table yet,
// so it does not count against the night's capacity.
const HOLDS_A_SEAT = ["confirmed", "seated"];

// Strip a stale live status before it leaves the API, so no client has to know
// the "a night runs past midnight" rule. A crowd level left over from Saturday
// must not render as live on Tuesday.
const withLive = (store) => {
  const live = store?.live;
  // `always` pins a status open-endedly, for demo venues that should look busy
  // whenever you open the app. Everything else expires with the night.
  const fresh =
    live?.crowd && (live.always === true || live.dateKey === currentNightKey());

  return {
    ...store,
    live: fresh
      ? {
          crowd: live.crowd,
          waitMinutes: live.waitMinutes ?? null,
          note: live.note || null,
          updatedAt: live.updatedAt || null,
        }
      : null,
  };
};

// A tenant may only act on a store they own; superadmin passes for support.
// Returns null rather than throwing, so callers answer 403 without leaking
// whether the store exists.
async function ownedStore(storeId, req) {
  if (!ObjectId.isValid(storeId)) return null;

  const store = await getDb()
    .collection("stores")
    .findOne(
      { _id: new ObjectId(storeId) },
      { projection: { owner: 1, name: 1, bookings: 1, loyalty: 1 } },
    );

  if (!store) return null;

  const isOwner = store.owner?.toString() === req.userId.toString();
  if (!isOwner && req.session.user?.type !== "superadmin") return null;

  return store;
}

// Seats left for a night; null when the venue set no cap and judges each
// request itself.
async function remainingCovers(store, dateKey) {
  const cap = store.bookings?.capacityPerNight;
  if (cap == null) return null;

  const [agg] = await getDb()
    .collection("reservations")
    .aggregate([
      {
        $match: {
          store: new ObjectId(store._id),
          dateKey,
          status: { $in: HOLDS_A_SEAT },
        },
      },
      { $group: { _id: null, covers: { $sum: "$partySize" } } },
    ])
    .toArray();

  return cap - (agg?.covers ?? 0);
}

// A 4-digit code the venue shows and the guest types. Derived from the session
// secret rather than stored, so there is nothing to rotate or clean up and it
// changes on its own every night.
const checkInCode = (storeId, dateKey) =>
  String(
    crypto
      .createHmac("sha256", process.env.SESSION_SECRET || "supersecret")
      .update(`${String(storeId)}:${dateKey}`)
      .digest()
      .readUInt32BE(0) % 10000,
  ).padStart(4, "0");

// Vibely counts visits; it does not track redemption. `rewardsEarned` is how
// many full cards the guest has filled, and settling up stays between them and
// the venue.
async function loyaltyCard(storeId, userId, store) {
  const target = store.loyalty?.stampsForReward ?? 6;
  const checkins = getDb().collection("checkins");
  const id = new ObjectId(storeId);

  const [stamps, tonight] = await Promise.all([
    checkins.countDocuments({ store: id, user: userId }),
    checkins.countDocuments(
      { store: id, user: userId, dateKey: currentNightKey() },
      { limit: 1 },
    ),
  ]);

  return {
    enabled: !!store.loyalty?.enabled,
    stamps,
    stampsForReward: target,
    rewardLabel: store.loyalty?.rewardLabel || null,
    progress: target > 0 ? stamps % target : 0,
    rewardsEarned: target > 0 ? Math.floor(stamps / target) : 0,
    checkedInTonight: !!tonight,
  };
}

/* =========================
   GET /stores
   Map feed. Supports ?q= ?category= ?live=1 and ?lat=&lng= for distance sorting.
========================= */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { q, category } = req.query;

    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    let stores = await getDb().collection("stores").find(filter).toArray();

    // Matching happens here rather than in mongo because a Greek search has to
    // ignore accents ("βαλαωριτου" -> "Βαλαωρίτου") and $regex cannot. The map
    // loads every pin anyway, so there is nothing extra to fetch.
    if (q) {
      const needle = normalizeText(q);
      stores = stores.filter((store) =>
        normalizeText(
          [store.name, store.area, store.address, ...(store.tags || [])].join(
            " ",
          ),
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
          stores
            .filter((s) => s.distanceKm != null && s.distanceKm <= radiusKm)
            .map(withLive),
        );
      }
    }

    // ?live=1 is the map's "Tonight" toggle: only venues actually reporting.
    if (req.query.live === "1") {
      return res.json(stores.map(withLive).filter((s) => s.live));
    }

    res.json(stores.map(withLive));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /stores/mine
   The venues this account runs. Declared above /:id or Express reads "mine"
   as a store id and answers 400.
========================= */
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const stores = await getDb()
      .collection("stores")
      .find({ owner: req.userId })
      .project({
        name: 1,
        images: 1,
        area: 1,
        category: 1,
        bookings: 1,
        loyalty: 1,
        live: 1,
        location: 1,
        ratings: 1,
      })
      .sort({ name: 1 })
      .toArray();

    res.json(stores.map(withLive));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /stores/:id/availability   ?dateKey=
   Asked before the booking form is filled in, so a full night can be greyed
   out instead of rejected on submit.
========================= */
router.get("/:id/availability", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return badId(res);

    const store = await getDb()
      .collection("stores")
      .findOne({ _id: new ObjectId(id) }, { projection: { bookings: 1 } });

    if (!store) return res.status(404).json({ message: "Store not found" });

    const bookings = store.bookings || {};
    if (!bookings.enabled) {
      return res.json({ enabled: false });
    }

    const dateKey = isDateKey(req.query.dateKey)
      ? req.query.dateKey
      : todayKey();

    const daysAhead = daysBetweenKeys(todayKey(), dateKey);
    const horizonDays = bookings.horizonDays ?? 14;
    const withinHorizon = daysAhead >= 0 && daysAhead <= horizonDays;

    const remaining = withinHorizon
      ? await remainingCovers({ _id: id, bookings }, dateKey)
      : 0;

    res.json({
      enabled: true,
      dateKey,
      withinHorizon,
      horizonDays,
      slots: bookings.slots ?? [],
      maxPartySize: bookings.maxPartySize ?? 10,
      autoConfirm: !!bookings.autoConfirm,
      // null = the venue set no cap and decides by hand.
      remaining,
    });
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
    if (!ObjectId.isValid(id)) return badId(res);

    const db = getDb();
    const storeId = new ObjectId(id);

    const store = await db.collection("stores").findOne({ _id: storeId });
    if (!store) return res.status(404).json({ message: "Store not found" });

    const [reviews, upcomingCount, myReview, breakdown, saved] =
      await Promise.all([
        db
          .collection("reviews")
          .find({ store: storeId })
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray(),
        db
          .collection("events")
          .countDocuments({ hostedBy: storeId, startDate: { $gte: new Date() } }),
        req.userId
          ? db
              .collection("reviews")
              .findOne({ store: storeId, author: req.userId })
          : null,
        // Star histogram for the rating breakdown bars in the sheet.
        db
          .collection("reviews")
          .aggregate([
            { $match: { store: storeId } },
            { $group: { _id: "$rating", count: { $sum: 1 } } },
          ])
          .toArray(),
        req.userId
          ? db
              .collection("users")
              .countDocuments(
                { _id: req.userId, savedStores: storeId },
                { limit: 1 },
              )
          : 0,
      ]);

    // Review authors, fetched in one go instead of per row.
    const authorIds = [...new Set(reviews.map((r) => r.author).filter(Boolean))];
    const authors = authorIds.length
      ? await db
          .collection("users")
          .find({ _id: { $in: authorIds } })
          .project({ username: 1, profileImageUrl: 1 })
          .toArray()
      : [];

    const byId = new Map(authors.map((a) => [a._id.toString(), a]));

    const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of breakdown) histogram[row._id] = row.count;

    res.json({
      ...withLive(store),
      reviews: reviews.map((r) => ({
        ...r,
        author: r.author ? (byId.get(r.author.toString()) ?? null) : null,
      })),
      upcomingCount,
      myReview,
      histogram,
      saved: !!saved,
    });
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
    if (!ObjectId.isValid(id)) return badId(res);

    const events = await getDb()
      .collection("events")
      .find({ hostedBy: new ObjectId(id), startDate: { $gte: new Date() } })
      .sort({ startDate: 1 })
      .limit(20)
      .toArray();

    res.json(
      events.map((e) => ({ ...e, attendantCount: e.attendants?.length ?? 0 })),
    );
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
    if (!ObjectId.isValid(id)) return badId(res);

    const db = getDb();
    const storeId = new ObjectId(id);

    const page = Math.max(1, parseNumber(req.query.page) ?? 1);
    const limit = Math.min(50, Math.max(1, parseNumber(req.query.limit) ?? 10));

    const [items, total] = await Promise.all([
      db
        .collection("reviews")
        .find({ store: storeId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      db.collection("reviews").countDocuments({ store: storeId }),
    ]);

    const authorIds = [...new Set(items.map((r) => r.author).filter(Boolean))];
    const authors = authorIds.length
      ? await db
          .collection("users")
          .find({ _id: { $in: authorIds } })
          .project({ username: 1, profileImageUrl: 1 })
          .toArray()
      : [];

    const byId = new Map(authors.map((a) => [a._id.toString(), a]));

    res.json({
      items: items.map((r) => ({
        ...r,
        author: r.author ? (byId.get(r.author.toString()) ?? null) : null,
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
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
    if (!ObjectId.isValid(id)) return badId(res);

    const rating = parseNumber(req.body.rating);
    if (rating == null || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const db = getDb();
    const storeId = new ObjectId(id);

    const store = await db
      .collection("stores")
      .findOne({ _id: storeId }, { projection: { _id: 1 } });
    if (!store) return res.status(404).json({ message: "Store not found" });

    const now = new Date();

    await db.collection("reviews").updateOne(
      { store: storeId, author: req.userId },
      {
        $set: { rating, comment: req.body.comment || "", updatedAt: now },
        $setOnInsert: { store: storeId, author: req.userId, createdAt: now },
      },
      { upsert: true },
    );

    const ratings = await recomputeRating(storeId);

    const review = await db
      .collection("reviews")
      .findOne({ store: storeId, author: req.userId });

    const author = await db
      .collection("users")
      .findOne(
        { _id: req.userId },
        { projection: { username: 1, profileImageUrl: 1 } },
      );

    res.status(201).json({ review: { ...review, author }, ratings });
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
    if (!ObjectId.isValid(id)) return badId(res);

    const storeId = new ObjectId(id);

    await getDb()
      .collection("reviews")
      .deleteOne({ store: storeId, author: req.userId });

    res.json({ ratings: await recomputeRating(storeId) });
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
    if (!ObjectId.isValid(id)) return badId(res);

    const users = getDb().collection("users");
    const storeId = new ObjectId(id);

    const alreadySaved = await users.countDocuments(
      { _id: req.userId, savedStores: storeId },
      { limit: 1 },
    );

    await users.updateOne(
      { _id: req.userId },
      alreadySaved
        ? { $pull: { savedStores: storeId } }
        : { $addToSet: { savedStores: storeId } },
    );

    res.json({ saved: !alreadySaved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   PUT /stores/:id/live
   The venue reports tonight. Sending crowd: null clears it.
========================= */
router.put("/:id/live", requireAuth, async (req, res) => {
  try {
    const store = await ownedStore(req.params.id, req);
    if (!store) return res.status(403).json({ message: "Not your store" });

    const stores = getDb().collection("stores");
    const { crowd, note } = req.body;

    // Clearing is a first-class action: a venue closing early should be able to
    // drop off the Tonight list without waiting for 06:00.
    if (crowd === null || crowd === "") {
      await stores.updateOne({ _id: store._id }, { $unset: { live: "" } });
      return res.json({ live: null });
    }

    if (!CROWD_LEVELS.includes(crowd)) {
      return res.status(400).json({ message: "Μη έγκυρη κατάσταση" });
    }

    const wait = parseNumber(req.body.waitMinutes);

    await stores.updateOne(
      { _id: store._id },
      {
        $set: {
          live: {
            dateKey: currentNightKey(),
            crowd,
            waitMinutes:
              wait != null ? Math.min(240, Math.max(0, wait)) : null,
            note: note?.trim() || null,
            updatedAt: new Date(),
          },
        },
      },
    );

    const updated = await stores.findOne(
      { _id: store._id },
      { projection: { live: 1 } },
    );

    res.json({ live: withLive(updated).live });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /stores/:id/check-in-code
   Tonight's code, for the venue to show at the door or on the table card.
========================= */
router.get("/:id/check-in-code", requireAuth, async (req, res) => {
  try {
    const store = await ownedStore(req.params.id, req);
    if (!store) return res.status(403).json({ message: "Not your store" });

    const dateKey = currentNightKey();

    res.json({
      dateKey,
      code: checkInCode(store._id, dateKey),
      enabled: !!store.loyalty?.enabled,
      checkedIn: await getDb()
        .collection("checkins")
        .countDocuments({ store: store._id, dateKey }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /stores/:id/check-in
   Guest types tonight's code and earns the night's stamp.
========================= */
router.post("/:id/check-in", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return badId(res);

    const db = getDb();
    const storeId = new ObjectId(id);

    const store = await db
      .collection("stores")
      .findOne({ _id: storeId }, { projection: { loyalty: 1, name: 1 } });

    if (!store) return res.status(404).json({ message: "Store not found" });

    if (!store.loyalty?.enabled) {
      return res
        .status(403)
        .json({ message: "Το μαγαζί δεν έχει κάρτα πόντων" });
    }

    const dateKey = currentNightKey();
    const expected = checkInCode(id, dateKey);
    const given = String(req.body.code ?? "").trim();

    // Compared in constant time so the four digits cannot be narrowed down by
    // timing a wrong guess. Lengths are checked first because timingSafeEqual
    // throws on a mismatch.
    const correct =
      given.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));

    if (!correct) return res.status(400).json({ message: "Λάθος κωδικός" });

    try {
      await db.collection("checkins").updateOne(
        { user: req.userId, store: storeId, dateKey },
        {
          $setOnInsert: {
            user: req.userId,
            store: storeId,
            dateKey,
            source: "code",
            reservation: null,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    } catch (err) {
      // Two taps racing for the same unique key. The stamp is there either
      // way, which is the outcome we wanted, so this is not a failure.
      if (err.code !== 11000) throw err;
    }

    res.status(201).json(await loyaltyCard(storeId, req.userId, store));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /stores/:id/loyalty   (my card at this venue)
========================= */
router.get("/:id/loyalty", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return badId(res);

    const store = await getDb()
      .collection("stores")
      .findOne({ _id: new ObjectId(id) }, { projection: { loyalty: 1 } });

    if (!store) return res.status(404).json({ message: "Store not found" });

    res.json(await loyaltyCard(new ObjectId(id), req.userId, store));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /stores/:id/analytics   ?days=30
   What the venue is paying for: did the bookings convert, did the guests turn
   up, and who are they.
========================= */
router.get("/:id/analytics", requireAuth, async (req, res) => {
  try {
    const store = await ownedStore(req.params.id, req);
    if (!store) return res.status(403).json({ message: "Not your store" });

    const db = getDb();
    const storeId = store._id;

    const days = Math.min(365, Math.max(7, parseNumber(req.query.days) ?? 30));

    // Night keys sort lexicographically, so a string range is a real range.
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromKey = toDateKey(from);
    const toKey = todayKey();

    const inRange = { $gte: fromKey, $lte: toKey };

    const [statusRows, nights, checkIns, saves, reviewAgg, eventRows] =
      await Promise.all([
        // Every booking outcome in the window, counted once.
        db
          .collection("reservations")
          .aggregate([
            { $match: { store: storeId, dateKey: inRange } },
            {
              $group: {
                _id: "$status",
                bookings: { $sum: 1 },
                covers: { $sum: "$partySize" },
              },
            },
          ])
          .toArray(),

        // Covers actually seated per night, busiest first.
        db
          .collection("reservations")
          .aggregate([
            {
              $match: {
                store: storeId,
                dateKey: inRange,
                status: { $in: HOLDS_A_SEAT },
              },
            },
            {
              $group: { _id: "$dateKey", covers: { $sum: "$partySize" } },
            },
            { $sort: { covers: -1 } },
            { $limit: 5 },
          ])
          .toArray(),

        db
          .collection("checkins")
          .aggregate([
            { $match: { store: storeId, dateKey: inRange } },
            { $group: { _id: "$user", visits: { $sum: 1 } } },
          ])
          .toArray(),

        db.collection("users").countDocuments({ savedStores: storeId }),

        db
          .collection("reviews")
          .aggregate([
            { $match: { store: storeId } },
            {
              $group: {
                _id: null,
                average: { $avg: "$rating" },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray(),

        db
          .collection("events")
          .aggregate([
            { $match: { hostedBy: storeId } },
            {
              $group: {
                _id: null,
                events: { $sum: 1 },
                attendants: { $sum: { $size: { $ifNull: ["$attendants", []] } } },
              },
            },
          ])
          .toArray(),
      ]);

    const byStatus = Object.fromEntries(
      statusRows.map((r) => [r._id, { bookings: r.bookings, covers: r.covers }]),
    );
    const count = (status) => byStatus[status]?.bookings ?? 0;

    const requested = statusRows.reduce((sum, r) => sum + r.bookings, 0);
    const answered = count("confirmed") + count("seated") + count("no_show");
    const seated = count("seated");

    // Who came: anyone who checked in, or whose table was marked at the door.
    const audienceIds = [...new Set(checkIns.map((c) => c._id.toString()))];

    res.json({
      range: { days, from: fromKey, to: toKey },

      bookings: {
        requested,
        pending: count("pending"),
        confirmed: answered,
        declined: count("declined"),
        cancelled: count("cancelled"),
        seated,
        noShow: count("no_show"),
        covers: byStatus.seated?.covers ?? 0,
        // Of everything the venue answered, how much it said yes to.
        confirmRate: requested
          ? Math.round((answered / requested) * 100)
          : null,
        // Of the tables it held, how many walked in.
        noShowRate:
          seated + count("no_show")
            ? Math.round((count("no_show") / (seated + count("no_show"))) * 100)
            : null,
      },

      visitors: {
        checkIns: checkIns.reduce((sum, c) => sum + c.visits, 0),
        unique: checkIns.length,
        returning: checkIns.filter((c) => c.visits > 1).length,
      },

      audience: await audienceProfile(audienceIds),

      saves,
      reviews: {
        average: reviewAgg[0] ? Math.round(reviewAgg[0].average * 10) / 10 : 0,
        count: reviewAgg[0]?.count ?? 0,
      },
      events: {
        total: eventRows[0]?.events ?? 0,
        attendants: eventRows[0]?.attendants ?? 0,
      },
      busiestNights: nights.map((n) => ({ dateKey: n._id, covers: n.covers })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// A venue must never be able to read one guest's age or gender off a chart, so
// the breakdowns are withheld until enough people are in the cohort to hide an
// individual. Below the threshold the venue still gets the headcount.
const MIN_COHORT = 5;

const AGE_BUCKETS = [
  ["18-20", 18, 20],
  ["21-24", 21, 24],
  ["25-29", 25, 29],
  ["30-39", 30, 39],
  ["40+", 40, 200],
];

async function audienceProfile(userIds) {
  if (userIds.length < MIN_COHORT) {
    return { total: userIds.length, withheld: true };
  }

  const people = await getDb()
    .collection("users")
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .project({ dateOfBirth: 1, gender: 1, favouriteGenres: 1 })
    .toArray();

  const ages = Object.fromEntries(AGE_BUCKETS.map(([label]) => [label, 0]));
  const gender = { male: 0, female: 0, other: 0, unknown: 0 };
  const genres = new Map();

  const now = new Date();

  for (const person of people) {
    if (person.dateOfBirth) {
      const born = new Date(person.dateOfBirth);
      let age = now.getFullYear() - born.getFullYear();
      const monthDelta = now.getMonth() - born.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) {
        age -= 1;
      }

      const bucket = AGE_BUCKETS.find(([, min, max]) => age >= min && age <= max);
      if (bucket) ages[bucket[0]] += 1;
    }

    gender[person.gender ?? "unknown"] =
      (gender[person.gender ?? "unknown"] ?? 0) + 1;

    for (const genre of person.favouriteGenres || []) {
      genres.set(genre, (genres.get(genre) ?? 0) + 1);
    }
  }

  return {
    total: people.length,
    withheld: false,
    ages,
    gender,
    topGenres: [...genres.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
  };
}

// The store carries a denormalised average so the map can render stars without
// touching the reviews collection. Recompute it whenever a review changes.
async function recomputeRating(storeId) {
  const db = getDb();

  const [agg] = await db
    .collection("reviews")
    .aggregate([
      { $match: { store: storeId } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();

  const ratings = {
    average: agg ? Math.round(agg.average * 10) / 10 : 0,
    count: agg ? agg.count : 0,
  };

  await db.collection("stores").updateOne({ _id: storeId }, { $set: { ratings } });

  return ratings;
}

module.exports = router;
