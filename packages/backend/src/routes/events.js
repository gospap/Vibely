const express = require("express");
const mongoose = require("mongoose");
const { Event, Store, User } = require("../../models");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { escapeRegex, normalizeText, paginate, parseNumber } = require("../utils/query");

const router = express.Router();

const badId = (res) => res.status(400).json({ message: "Invalid event id" });

// "Ongoing from now to infinity": anything that has not finished yet. Events
// without an endDate fall back to their start, so a night that began an hour
// ago still shows up in the feed.
const upcomingFilter = (now = new Date()) => ({
  $or: [{ endDate: { $gte: now } }, { endDate: null, startDate: { $gte: now } }],
});

/* =========================
   GET /events
   Paginated upcoming feed, 10 per page. ?genre= ?storeId= ?q=
========================= */
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query, { defaultLimit: 10 });

    const filter = upcomingFilter();

    if (req.query.genre && req.query.genre !== "all") {
      filter.musicGenre = req.query.genre;
    }

    if (req.query.storeId && mongoose.isValidObjectId(req.query.storeId)) {
      filter.hostedBy = req.query.storeId;
    }

    if (req.query.q) {
      // searchText is the accent-stripped mirror of title/description/lineup,
      // so "μυλος" finds "Μύλος".
      filter.searchText = new RegExp(escapeRegex(normalizeText(req.query.q)));
    }

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .populate("hostedBy", "name images ratings area address location category")
        .lean(),
      Event.countDocuments(filter),
    ]);

    const items = events.map((event) => decorate(event, req.userId));

    res.json({
      items,
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
    const genres = await Event.distinct("musicGenre", upcomingFilter());
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
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const event = await Event.findById(id)
      .populate(
        "hostedBy",
        "name images ratings area address location category phone instagram description",
      )
      .populate("attendants", "username profileImageUrl")
      .lean();

    if (!event) return res.status(404).json({ message: "Event not found" });

    const attending = req.userId
      ? (event.attendants || []).some(
          (a) => a._id.toString() === req.userId.toString(),
        )
      : false;

    res.json({
      ...event,
      store: event.hostedBy || null,
      attendantCount: event.attendants?.length ?? 0,
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
   Kept in sync on both sides: Event.attendants and User.onGoingEvents.
========================= */
router.post("/:id/attend", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const event = await Event.findById(id).select("capacity attendants");
    if (!event) return res.status(404).json({ message: "Event not found" });

    const already = event.attendants.some(
      (a) => a.toString() === req.userId.toString(),
    );

    if (!already && event.capacity && event.attendants.length >= event.capacity) {
      return res.status(409).json({ message: "Event is full" });
    }

    await Promise.all([
      Event.updateOne({ _id: id }, { $addToSet: { attendants: req.userId } }),
      User.updateOne({ _id: req.userId }, { $addToSet: { onGoingEvents: id } }),
    ]);

    const count = await Event.findById(id).select("attendants").lean();

    res.json({ attending: true, attendantCount: count.attendants.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id/attend", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    await Promise.all([
      Event.updateOne({ _id: id }, { $pull: { attendants: req.userId } }),
      User.updateOne({ _id: req.userId }, { $pull: { onGoingEvents: id } }),
    ]);

    const count = await Event.findById(id).select("attendants").lean();
    if (!count) return res.status(404).json({ message: "Event not found" });

    res.json({ attending: false, attendantCount: count.attendants.length });
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
      return res.status(400).json({ message: "Title and startDate are required" });
    }

    if (hostedBy && !mongoose.isValidObjectId(hostedBy)) {
      return res.status(400).json({ message: "Invalid store id" });
    }

    if (hostedBy) {
      const store = await Store.findById(hostedBy).select("owner");
      if (!store) return res.status(404).json({ message: "Store not found" });

      const isOwner = store.owner?.toString() === req.userId.toString();
      if (!isOwner && req.session.user?.type !== "superadmin") {
        return res.status(403).json({ message: "Not your store" });
      }
    }

    const event = await Event.create({
      title,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      startHour,
      endHour,
      musicGenre,
      lineup: Array.isArray(lineup) ? lineup : undefined,
      ticketPrice: parseNumber(ticketPrice) ?? 0,
      capacity: parseNumber(capacity) ?? undefined,
      hostedBy,
      images: Array.isArray(images) ? images : undefined,
      attendants: [],
    });

    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Flatten the populated host into the `store` shape the list cards render, and
// answer "am I going?" without a second round trip.
function decorate(event, userId) {
  const attendants = event.attendants || [];

  return {
    ...event,
    store: event.hostedBy
      ? {
          _id: event.hostedBy._id,
          name: event.hostedBy.name,
          image: event.hostedBy.images?.[0],
          area: event.hostedBy.area,
          ratings: event.hostedBy.ratings,
          location: event.hostedBy.location,
        }
      : null,
    attendantCount: attendants.length,
    attending: userId
      ? attendants.some((a) => a.toString() === userId.toString())
      : false,
  };
}

module.exports = router;
