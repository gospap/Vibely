const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("../../db");
const { requireAuth } = require("../middleware/auth");
const {
  paginate,
  parseNumber,
  isDateKey,
  todayKey,
  daysBetweenKeys,
} = require("../utils/query");
const { entitlement } = require("../utils/trial");

const router = express.Router();

const badId = (res) =>
  res.status(400).json({ message: "Invalid reservation id" });

// Statuses the guest may still walk away from.
const CANCELLABLE = ["pending", "confirmed"];

// Statuses that hold a seat. A pending request has not been given a table yet,
// so it does not count against the night's capacity.
const HOLDS_A_SEAT = ["confirmed", "seated"];

// Where the venue may move a booking from each state. Anything not listed is
// refused rather than quietly applied, so a stale screen cannot un-decline a
// table or mark a cancelled one as seated.
const TRANSITIONS = {
  pending: ["confirmed", "declined"],
  confirmed: ["seated", "no_show", "declined"],
};

// A tenant may only act on a store they own. Superadmin passes so support can
// step in. Returns null rather than throwing, so callers answer 403 without
// leaking whether the store exists.
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

// Stands in for populate: one extra query per referenced collection, stitched
// in JS. Explicit, and it keeps the projection next to the endpoint using it.
async function attach(rows, { collection, field, as, projection }) {
  const ids = [...new Set(rows.map((r) => r[field]).filter(Boolean))];
  if (!ids.length) return rows.map((r) => ({ ...r, [as]: null }));

  const docs = await getDb()
    .collection(collection)
    .find({ _id: { $in: ids } })
    .project(projection)
    .toArray();

  const byId = new Map(docs.map((d) => [d._id.toString(), d]));

  return rows.map((r) => ({
    ...r,
    [as]: r[field] ? (byId.get(r[field].toString()) ?? null) : null,
  }));
}

// The guest's rows carry the venue and, when it was booked off one, the event.
async function asGuestRows(rows) {
  const withStore = await attach(rows, {
    collection: "stores",
    field: "store",
    as: "store",
    projection: { name: 1, images: 1, area: 1, location: 1, category: 1 },
  });

  return attach(withStore, {
    collection: "events",
    field: "event",
    as: "event",
    projection: { title: 1, startHour: 1, startDate: 1 },
  });
}

// The venue's rows carry the guest and the event instead.
async function asVenueRows(rows) {
  const withUser = await attach(rows, {
    collection: "users",
    field: "user",
    as: "user",
    projection: { username: 1, profileImageUrl: 1 },
  });

  return attach(withUser, {
    collection: "events",
    field: "event",
    as: "event",
    projection: { title: 1, startHour: 1 },
  });
}

/* =========================
   POST /reservations
   Guest asks a venue for a table.
========================= */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      storeId,
      eventId,
      dateKey,
      arrivalTime,
      note,
      contactName,
      contactPhone,
    } = req.body;

    if (!ObjectId.isValid(storeId)) {
      return res.status(400).json({ message: "Invalid store id" });
    }

    const db = getDb();
    const store = await db
      .collection("stores")
      .findOne(
        { _id: new ObjectId(storeId) },
        { projection: { bookings: 1, name: 1, subscription: 1 } },
      );

    if (!store) return res.status(404).json({ message: "Store not found" });

    // A lapsed venue stops taking *new* bookings. The ones it already
    // confirmed are untouched — guests turning up to a table they were
    // promised is not something a billing problem gets to break.
    if (!entitlement(store).entitled) {
      return res
        .status(403)
        .json({ message: "Το μαγαζί δεν δέχεται κρατήσεις αυτή τη στιγμή" });
    }

    if (!store.bookings?.enabled) {
      return res
        .status(403)
        .json({ message: "Το μαγαζί δεν δέχεται κρατήσεις" });
    }

    if (!isDateKey(dateKey)) {
      return res.status(400).json({ message: "Μη έγκυρη ημερομηνία" });
    }

    const daysAhead = daysBetweenKeys(todayKey(), dateKey);
    if (daysAhead < 0) {
      return res.status(400).json({ message: "Η βραδιά έχει περάσει" });
    }

    const horizon = store.bookings.horizonDays ?? 14;
    if (daysAhead > horizon) {
      return res
        .status(400)
        .json({ message: `Κρατήσεις μόνο έως ${horizon} μέρες μπροστά` });
    }

    const maxParty = store.bookings.maxPartySize ?? 10;
    const partySize = parseNumber(req.body.partySize);
    if (partySize == null || partySize < 1 || partySize > maxParty) {
      return res
        .status(400)
        .json({ message: `Τα άτομα πρέπει να είναι 1 έως ${maxParty}` });
    }

    const slots = store.bookings.slots;
    if (slots?.length && !slots.includes(arrivalTime)) {
      return res.status(400).json({ message: "Μη διαθέσιμη ώρα άφιξης" });
    }

    if (eventId) {
      if (!ObjectId.isValid(eventId)) {
        return res.status(400).json({ message: "Invalid event id" });
      }

      const event = await db
        .collection("events")
        .findOne(
          { _id: new ObjectId(eventId) },
          { projection: { hostedBy: 1 } },
        );

      if (!event || event.hostedBy?.toString() !== storeId.toString()) {
        return res
          .status(400)
          .json({ message: "Το event δεν γίνεται σε αυτό το μαγαζί" });
      }
    }

    // Auto-confirm only when the venue asked for it *and* the night still has
    // room. Otherwise it lands as pending and the venue decides.
    let status = "pending";
    if (store.bookings.autoConfirm) {
      const remaining = await remainingCovers(store, dateKey);
      if (remaining == null || remaining >= partySize) status = "confirmed";
    }

    const now = new Date();
    const doc = {
      store: new ObjectId(storeId),
      user: req.userId,
      event: eventId ? new ObjectId(eventId) : null,
      dateKey,
      arrivalTime: arrivalTime || null,
      partySize,
      status,
      note: note?.trim() || null,
      contactName: contactName?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      tableLabel: null,
      responseNote: null,
      respondedAt: status === "confirmed" ? now : null,
      respondedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await db.collection("reservations").insertOne(doc);

    const [row] = await asGuestRows([{ ...doc, _id: insertedId }]);
    res.status(201).json(row);
  } catch (err) {
    // The partial unique index is what actually stops a double booking;
    // catching it here is cheaper and safer than a find-then-insert race.
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Έχεις ήδη κράτηση εδώ για αυτή τη βραδιά" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /reservations/me   ?scope=upcoming|past
========================= */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const past = req.query.scope === "past";
    const today = todayKey();

    const rows = await getDb()
      .collection("reservations")
      .find({
        user: req.userId,
        dateKey: past ? { $lt: today } : { $gte: today },
      })
      .sort({ dateKey: past ? -1 : 1, arrivalTime: 1 })
      .limit(100)
      .toArray();

    res.json(await asGuestRows(rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /reservations/store/:storeId   ?dateKey=
   The venue's sheet for one night.
========================= */
router.get("/store/:storeId", requireAuth, async (req, res) => {
  try {
    const store = await ownedStore(req.params.storeId, req);
    if (!store) return res.status(403).json({ message: "Not your store" });

    const dateKey = isDateKey(req.query.dateKey)
      ? req.query.dateKey
      : todayKey();

    const rows = await getDb()
      .collection("reservations")
      .find({ store: store._id, dateKey })
      .sort({ arrivalTime: 1, createdAt: 1 })
      .toArray();

    // Summed in JS rather than with a second aggregate — this is one night's
    // rows and they are already in memory.
    const covers = { pending: 0, confirmed: 0 };
    for (const item of rows) {
      if (item.status === "pending") covers.pending += item.partySize;
      if (HOLDS_A_SEAT.includes(item.status)) covers.confirmed += item.partySize;
    }

    res.json({
      dateKey,
      store: { _id: store._id, name: store.name },
      capacityPerNight: store.bookings?.capacityPerNight ?? null,
      maxPartySize: store.bookings?.maxPartySize ?? 10,
      covers,
      items: await asVenueRows(rows),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /reservations/store/:storeId/list   ?scope=pending|upcoming|past &page=
   The booking book, across nights rather than one at a time. The night sheet
   above answers "who is coming tonight"; this answers "what still needs me".
========================= */
router.get("/store/:storeId/list", requireAuth, async (req, res) => {
  try {
    const store = await ownedStore(req.params.storeId, req);
    if (!store) return res.status(403).json({ message: "Not your store" });

    const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });
    const today = todayKey();

    const scopes = {
      // Anything still waiting on an answer, oldest request first — a queue,
      // not a feed, so the person who asked first is dealt with first.
      pending: {
        filter: { status: "pending", dateKey: { $gte: today } },
        sort: { createdAt: 1 },
      },
      upcoming: {
        filter: { status: { $in: HOLDS_A_SEAT }, dateKey: { $gte: today } },
        sort: { dateKey: 1, arrivalTime: 1 },
      },
      past: {
        filter: { dateKey: { $lt: today } },
        sort: { dateKey: -1, arrivalTime: 1 },
      },
    };

    const scope = scopes[req.query.scope] ?? scopes.pending;
    const filter = { store: store._id, ...scope.filter };

    const [rows, total] = await Promise.all([
      getDb()
        .collection("reservations")
        .find(filter)
        .sort(scope.sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      getDb().collection("reservations").countDocuments(filter),
    ]);

    res.json({
      items: await asVenueRows(rows),
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
   GET /reservations/store/:storeId/summary
   One row per upcoming night, so the dashboard can flag the ones that need an
   answer without loading every sheet.
========================= */
router.get("/store/:storeId/summary", requireAuth, async (req, res) => {
  try {
    const store = await ownedStore(req.params.storeId, req);
    if (!store) return res.status(403).json({ message: "Not your store" });

    const rows = await getDb()
      .collection("reservations")
      .aggregate([
        {
          $match: {
            store: store._id,
            dateKey: { $gte: todayKey() },
            status: { $in: ["pending", ...HOLDS_A_SEAT] },
          },
        },
        {
          $group: {
            _id: { dateKey: "$dateKey", status: "$status" },
            bookings: { $sum: 1 },
            covers: { $sum: "$partySize" },
          },
        },
        { $sort: { "_id.dateKey": 1 } },
      ])
      .toArray();

    const nights = new Map();
    for (const row of rows) {
      const key = row._id.dateKey;
      if (!nights.has(key)) {
        nights.set(key, { dateKey: key, pending: 0, confirmed: 0, covers: 0 });
      }

      const night = nights.get(key);
      if (row._id.status === "pending") {
        night.pending += row.bookings;
      } else {
        night.confirmed += row.bookings;
        night.covers += row.covers;
      }
    }

    res.json([...nights.values()]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   PATCH /reservations/:id
   The venue answers: confirm, decline, assign a table, or mark the door.
========================= */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return badId(res);

    const db = getDb();
    const reservationId = new ObjectId(id);

    const reservation = await db
      .collection("reservations")
      .findOne({ _id: reservationId });

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    const store = await ownedStore(reservation.store, req);
    if (!store) return res.status(403).json({ message: "Not your store" });

    const { status, tableLabel, responseNote } = req.body;
    const update = { updatedAt: new Date() };

    if (status) {
      const allowed = TRANSITIONS[reservation.status] || [];
      if (!allowed.includes(status)) {
        return res.status(409).json({ message: "Μη έγκυρη ενέργεια" });
      }

      // Two pending requests can each look fine against the same free seats,
      // so the cap is re-checked at the moment of confirming rather than when
      // the guest asked.
      if (status === "confirmed") {
        const remaining = await remainingCovers(store, reservation.dateKey);
        if (remaining != null && remaining < reservation.partySize) {
          return res
            .status(409)
            .json({ message: "Δεν υπάρχει χώρος για αυτή τη βραδιά" });
        }
      }

      update.status = status;
      update.respondedAt = new Date();
      update.respondedBy = req.userId;
    }

    if (tableLabel !== undefined) update.tableLabel = tableLabel?.trim() || null;
    if (responseNote !== undefined) {
      update.responseNote = responseNote?.trim() || null;
    }

    await db
      .collection("reservations")
      .updateOne({ _id: reservationId }, { $set: update });

    // Marking someone in at the door is the strongest proof of a visit there
    // is, so it earns the loyalty stamp without them typing the code. The
    // unique index makes a second one for the same night a no-op.
    if (status === "seated" && store.loyalty?.enabled) {
      try {
        await db.collection("checkins").updateOne(
          {
            user: reservation.user,
            store: reservation.store,
            dateKey: reservation.dateKey,
          },
          {
            $setOnInsert: {
              user: reservation.user,
              store: reservation.store,
              dateKey: reservation.dateKey,
              source: "reservation",
              reservation: reservationId,
              createdAt: new Date(),
            },
          },
          { upsert: true },
        );
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }

    const [row] = await asVenueRows([{ ...reservation, ...update }]);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   DELETE /reservations/:id
   Guest cancels their own.
========================= */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return badId(res);

    const db = getDb();
    const reservationId = new ObjectId(id);

    const reservation = await db
      .collection("reservations")
      .findOne({ _id: reservationId });

    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    if (reservation.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Not your reservation" });
    }

    if (!CANCELLABLE.includes(reservation.status)) {
      return res.status(409).json({ message: "Η κράτηση δεν ακυρώνεται πλέον" });
    }

    if (daysBetweenKeys(todayKey(), reservation.dateKey) < 0) {
      return res.status(409).json({ message: "Η βραδιά έχει περάσει" });
    }

    // Marked, not deleted — the venue needs to see that a confirmed table
    // freed up, rather than have the row vanish off their sheet.
    await db
      .collection("reservations")
      .updateOne(
        { _id: reservationId },
        { $set: { status: "cancelled", updatedAt: new Date() } },
      );

    const [row] = await asGuestRows([
      { ...reservation, status: "cancelled" },
    ]);

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
