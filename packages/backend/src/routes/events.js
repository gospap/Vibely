const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("../../db");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const {
  escapeRegex,
  normalizeText,
  paginate,
  parseNumber,
  currentNightKey,
  nightWindow,
} = require("../utils/query");
const { entitlement } = require("../utils/trial");

const router = express.Router();

const badId = (res) => res.status(400).json({ message: "Invalid event id" });

// "Ongoing from now to infinity": anything that has not finished yet. Events
// without an endDate fall back to their start, so a night that began an hour
// ago still shows up in the feed.
const upcomingFilter = (now = new Date()) => ({
  $or: [{ endDate: { $gte: now } }, { endDate: null, startDate: { $gte: now } }],
});

// Just tonight: anything starting between 18:00 and 06:00 of the night that is
// currently running, plus whatever is already under way. At 02:00 that is still
// last evening's night — see currentNightKey.
const tonightFilter = (now = new Date()) => {
  const { from, to } = nightWindow(currentNightKey(now));

  return {
    $or: [
      { startDate: { $gte: from, $lt: to } },
      { startDate: { $lte: now }, endDate: { $gte: now } },
    ],
  };
};

// Paid placement on the host venue. Time-boxed, so an unrenewed promotion
// lapses on its own. Always surfaced as a label — never silently reordered
// without saying why.
const livePromotion = (store, now = new Date()) => {
  const promoted = store?.promoted;
  if (!promoted?.until || new Date(promoted.until) <= now) return null;

  return { label: promoted.label || "Προτεινόμενο" };
};

// The host's live status, but only while it is still about tonight — a crowd
// level left over from Saturday must not render as live on Tuesday.
const liveNow = (store) => {
  const live = store?.live;
  // `always` pins a status open-endedly for demo venues; see stores.js.
  const fresh =
    live?.crowd && (live.always === true || live.dateKey === currentNightKey());
  if (!fresh) return null;

  return {
    crowd: live.crowd,
    waitMinutes: live.waitMinutes ?? null,
    note: live.note || null,
  };
};

// Accent-stripped title + description + lineup, so "μυλος" finds "Μύλος".
const eventSearchText = (event) =>
  normalizeText(
    [event.title, event.description, ...(event.lineup || [])].join(" "),
  );

/* =========================
   GET /events
   Paginated upcoming feed, 10 per page. ?tonight=1 ?genre= ?storeId= ?q=
========================= */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });

    const filter =
      req.query.tonight === "1" ? tonightFilter() : upcomingFilter();

    if (req.query.genre && req.query.genre !== "all") {
      filter.musicGenre = req.query.genre;
    }

    if (req.query.storeId && ObjectId.isValid(req.query.storeId)) {
      filter.hostedBy = new ObjectId(req.query.storeId);
    }

    if (req.query.q) {
      // searchText is the accent-stripped mirror of title/description/lineup.
      filter.searchText = new RegExp(escapeRegex(normalizeText(req.query.q)));
    }

    const db = getDb();

    const [events, total] = await Promise.all([
      db
        .collection("events")
        .find(filter)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("events").countDocuments(filter),
    ]);

    // Stands in for populate: one extra query for the hosts on this page, then
    // stitched in below. The cards want a flatter shape than the raw store doc.
    const hostIds = [...new Set(events.map((e) => e.hostedBy).filter(Boolean))];
    const hosts = await db
      .collection("stores")
      .find({ _id: { $in: hostIds } })
      .project({
        name: 1,
        images: 1,
        ratings: 1,
        area: 1,
        address: 1,
        location: 1,
        category: 1,
        live: 1,
        bookings: 1,
        promoted: 1,
      })
      .toArray();

    const byId = new Map(hosts.map((s) => [s._id.toString(), s]));
    const items = events.map((event) =>
      decorate(event, byId.get(event.hostedBy?.toString()), req.userId),
    );

    res.json({
      items,
      // Paid placement rides in its own labelled slot rather than being mixed
      // into the feed. The order the user asked for stays the order they get,
      // and the promoted ones are visibly separate instead of quietly first.
      promoted: page === 1 ? await promotedEvents(req.userId) : [],
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
   GET /events/genres
   Distinct genres of upcoming events, for the filter chips.
========================= */
router.get("/genres", async (req, res) => {
  try {
    const genres = await getDb()
      .collection("events")
      .distinct("musicGenre", upcomingFilter());

    res.json(genres.filter(Boolean).sort());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /events/:id
   Detail sheet: full event, host store with ratings, who is going.
========================= */
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return badId(res);

    const db = getDb();

    const event = await db
      .collection("events")
      .findOne({ _id: new ObjectId(id) });

    if (!event) return res.status(404).json({ message: "Event not found" });

    const attendantIds = event.attendants || [];

    const [host, attendants] = await Promise.all([
      event.hostedBy
        ? db.collection("stores").findOne(
            { _id: event.hostedBy },
            {
              projection: {
                name: 1,
                images: 1,
                ratings: 1,
                area: 1,
                address: 1,
                location: 1,
                category: 1,
                phone: 1,
                instagram: 1,
                description: 1,
                // bookings comes along so the sheet knows whether to offer a
                // table; live drives the "γεμίζει" badge.
                bookings: 1,
                live: 1,
              },
            },
          )
        : null,
      attendantIds.length
        ? db
            .collection("users")
            .find({ _id: { $in: attendantIds } })
            .project({ username: 1, profileImageUrl: 1 })
            .toArray()
        : [],
    ]);

    const attending = req.userId
      ? attendantIds.some((a) => a.toString() === req.userId.toString())
      : false;

    res.json({
      ...event,
      attendants,
      store: host ? { ...host, live: liveNow(host) } : null,
      attendantCount: attendantIds.length,
      attending,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /events/:id/attend    — join
   DELETE /events/:id/attend  — leave
   Kept in sync on both sides: the event's attendants and the user's
   onGoingEvents.
========================= */
router.post("/:id/attend", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return badId(res);

    const db = getDb();
    const eventId = new ObjectId(id);

    const event = await db
      .collection("events")
      .findOne(
        { _id: eventId },
        { projection: { capacity: 1, attendants: 1 } },
      );

    if (!event) return res.status(404).json({ message: "Event not found" });

    const attendants = event.attendants || [];
    const already = attendants.some(
      (a) => a.toString() === req.userId.toString(),
    );

    if (!already && event.capacity && attendants.length >= event.capacity) {
      return res.status(409).json({ message: "Event is full" });
    }

    await Promise.all([
      db
        .collection("events")
        .updateOne({ _id: eventId }, { $addToSet: { attendants: req.userId } }),
      db
        .collection("users")
        .updateOne(
          { _id: req.userId },
          { $addToSet: { onGoingEvents: eventId } },
        ),
    ]);

    const fresh = await db
      .collection("events")
      .findOne({ _id: eventId }, { projection: { attendants: 1 } });

    res.json({ attending: true, attendantCount: fresh.attendants.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id/attend", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return badId(res);

    const db = getDb();
    const eventId = new ObjectId(id);

    await Promise.all([
      db
        .collection("events")
        .updateOne({ _id: eventId }, { $pull: { attendants: req.userId } }),
      db
        .collection("users")
        .updateOne({ _id: req.userId }, { $pull: { onGoingEvents: eventId } }),
    ]);

    const fresh = await db
      .collection("events")
      .findOne({ _id: eventId }, { projection: { attendants: 1 } });

    if (!fresh) return res.status(404).json({ message: "Event not found" });

    res.json({ attending: false, attendantCount: fresh.attendants.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /events  (tenant creates an event at their store)
========================= */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      startHour,
      endHour,
      musicGenre,
      lineup,
      ticketPrice,
      capacity,
      hostedBy,
      images,
    } = req.body;

    if (!title || !startDate) {
      return res
        .status(400)
        .json({ message: "Title and startDate are required" });
    }

    if (hostedBy && !ObjectId.isValid(hostedBy)) {
      return res.status(400).json({ message: "Invalid store id" });
    }

    const db = getDb();

    if (hostedBy) {
      const store = await db
        .collection("stores")
        .findOne(
          { _id: new ObjectId(hostedBy) },
          { projection: { owner: 1, subscription: 1 } },
        );

      if (!store) return res.status(404).json({ message: "Store not found" });

      const isSuperadmin = req.session.user?.type === "superadmin";
      const isOwner = store.owner?.toString() === req.userId.toString();

      if (!isOwner && !isSuperadmin) {
        return res.status(403).json({ message: "Not your store" });
      }

      // Posting an event is a paid action: a lapsed venue keeps the events it
      // already published but cannot add more.
      const state = entitlement(store);
      if (!state.entitled && !isSuperadmin) {
        return res.status(402).json({
          message: "Χρειάζεται ενεργή συνδρομή για να ανεβάσεις event",
          subscription: state,
        });
      }
    }

    const now = new Date();
    const doc = {
      title,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      startHour,
      endHour,
      musicGenre,
      lineup: Array.isArray(lineup) ? lineup : [],
      ticketPrice: parseNumber(ticketPrice) ?? 0,
      capacity: parseNumber(capacity) ?? undefined,
      hostedBy: hostedBy ? new ObjectId(hostedBy) : null,
      images: Array.isArray(images) ? images : [],
      attendants: [],
      createdAt: now,
      updatedAt: now,
    };

    // The feed is paginated in mongo, so search has to be a database filter and
    // cannot normalise in JS the way the (much smaller) store list does.
    doc.searchText = eventSearchText(doc);

    const { insertedId } = await db.collection("events").insertOne(doc);

    res.status(201).json({ ...doc, _id: insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Up to three upcoming events at venues currently paying for placement. Kept
// separate from the feed so the slot can be labelled rather than passed off as
// an organic result.
const PROMOTED_SLOTS = 3;

async function promotedEvents(userId) {
  const db = getDb();

  const promotedStores = await db
    .collection("stores")
    .find({ "promoted.until": { $gt: new Date() } })
    .project({ name: 1, images: 1, ratings: 1, area: 1, location: 1, promoted: 1, bookings: 1, live: 1 })
    .toArray();

  if (!promotedStores.length) return [];

  const events = await db
    .collection("events")
    .find({
      hostedBy: { $in: promotedStores.map((s) => s._id) },
      ...upcomingFilter(),
    })
    .sort({ startDate: 1 })
    .limit(PROMOTED_SLOTS)
    .toArray();

  const byId = new Map(promotedStores.map((s) => [s._id.toString(), s]));

  return events.map((event) =>
    decorate(event, byId.get(event.hostedBy?.toString()), userId),
  );
}

// Flatten the host into the `store` shape the list cards render, and answer
// "am I going?" without a second round trip.
function decorate(event, host, userId) {
  const attendants = event.attendants || [];

  return {
    ...event,
    store: host
      ? {
          _id: host._id,
          name: host.name,
          image: host.images?.[0],
          area: host.area,
          ratings: host.ratings,
          location: host.location,
          // Drives the "γεμίζει" badge on a card in the Tonight feed, and
          // whether the card offers a table.
          live: liveNow(host),
          bookingsEnabled: !!host.bookings?.enabled,
          promoted: livePromotion(host),
        }
      : null,
    attendantCount: attendants.length,
    attending: userId
      ? attendants.some((a) => a.toString() === userId.toString())
      : false,
  };
}

module.exports = router;
