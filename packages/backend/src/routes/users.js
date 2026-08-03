const express = require("express");
const mongoose = require("mongoose");
const { User, Event, UserPreference } = require("../../models");
const { requireAuth } = require("../middleware/auth");
const { escapeRegex, normalizeText, paginate } = require("../utils/query");

const router = express.Router();

// Never leak the hash or the request inbox of other people.
const PUBLIC_FIELDS = "username profileImageUrl bio gender favouriteGenres createdAt";

const badId = (res) => res.status(400).json({ message: "Invalid user id" });

/* =========================
   GET /users/search?q=
   Instagram-style people search. Returns the relation to the caller so the
   result row can render the right button (Add / Pending / Message).
========================= */
router.get("/search", requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req.query, { defaultLimit: 20 });
    const q = (req.query.q || "").trim();

    const me = await User.findById(req.userId)
      .select("friends friendRequests")
      .lean();

    const filter = { _id: { $ne: req.userId } };

    if (q) {
      // usernameLower is the accent-stripped mirror, so "ελενη" finds "Ελένη".
      filter.usernameLower = new RegExp(escapeRegex(normalizeText(q)));
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(PUBLIC_FIELDS)
        .sort({ usernameLower: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // One pass over my own doc instead of a query per result row.
    const friendIds = new Set((me?.friends || []).map(String));
    const incomingIds = new Set(
      (me?.friendRequests || [])
        .filter((r) => r.status === "pending")
        .map((r) => String(r.from)),
    );

    const sentTo = await User.find({
      _id: { $in: users.map((u) => u._id) },
      friendRequests: { $elemMatch: { from: req.userId, status: "pending" } },
    })
      .select("_id")
      .lean();
    const sentIds = new Set(sentTo.map((u) => String(u._id)));

    const items = users.map((u) => ({
      ...u,
      relation: friendIds.has(String(u._id))
        ? "friends"
        : incomingIds.has(String(u._id))
          ? "incoming"
          : sentIds.has(String(u._id))
            ? "requested"
            : "none",
    }));

    res.json({ items, page, limit, total, hasMore: page * limit < total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /users/me/friends
========================= */
router.get("/me/friends", requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.userId)
      .populate("friends", PUBLIC_FIELDS)
      .lean();

    res.json(me?.friends ?? []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /users/me/requests
   Incoming pending requests, newest first.
========================= */
router.get("/me/requests", requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.userId)
      .populate("friendRequests.from", PUBLIC_FIELDS)
      .lean();

    const pending = (me?.friendRequests || [])
      .filter((r) => r.status === "pending" && r.from)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((r) => ({ user: r.from, createdAt: r.createdAt }));

    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /users/me/events
   My upcoming events, for the profile screen.
========================= */
router.get("/me/events", requireAuth, async (req, res) => {
  try {
    const events = await Event.find({
      attendants: req.userId,
      $or: [
        { endDate: { $gte: new Date() } },
        { endDate: null, startDate: { $gte: new Date() } },
      ],
    })
      .sort({ startDate: 1 })
      .populate("hostedBy", "name images area")
      .lean();

    res.json(
      events.map((e) => ({
        ...e,
        store: e.hostedBy
          ? {
              _id: e.hostedBy._id,
              name: e.hostedBy.name,
              image: e.hostedBy.images?.[0],
              area: e.hostedBy.area,
            }
          : null,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   PATCH /users/me
   Profile edit. Whitelisted so a client cannot promote itself to superadmin.
========================= */
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const allowed = [
      "username",
      "bio",
      "profileImageUrl",
      "dateOfBirth",
      "gender",
      "favouriteGenres",
    ];

    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (update.username != null) {
      update.username = String(update.username).trim();
      if (!update.username) {
        return res.status(400).json({ message: "Username cannot be empty" });
      }
      update.usernameLower = normalizeText(update.username);
    }

    if (update.dateOfBirth) update.dateOfBirth = new Date(update.dateOfBirth);

    if (update.gender && !["male", "female", "other"].includes(update.gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    delete user.password;
    delete user.__v;
    user.id = user._id.toString();

    // Keep the session copy in step so /auth/me does not serve a stale name.
    if (req.session.user) {
      req.session.user = {
        ...req.session.user,
        username: user.username,
        profileImageUrl: user.profileImageUrl ?? null,
      };
    }

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET / PUT  /users/me/preferences
========================= */
router.get("/me/preferences", requireAuth, async (req, res) => {
  try {
    // Created on first read so the client always gets a full object.
    const prefs = await UserPreference.findOneAndUpdate(
      { user: req.userId },
      { $setOnInsert: { user: req.userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    res.json(prefs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/me/preferences", requireAuth, async (req, res) => {
  try {
    const { theme, language, searchRadiusKm, notifications, privacy } = req.body;

    const update = {};
    if (theme && ["light", "dark"].includes(theme)) update.theme = theme;
    if (language && ["el", "en"].includes(language)) update.language = language;
    if (Number.isFinite(Number(searchRadiusKm))) {
      update.searchRadiusKm = Math.min(50, Math.max(1, Number(searchRadiusKm)));
    }

    // Dot-notation so a partial toggle does not wipe the sibling flags.
    for (const [key, value] of Object.entries(notifications || {})) {
      if (typeof value === "boolean") update[`notifications.${key}`] = value;
    }
    for (const [key, value] of Object.entries(privacy || {})) {
      if (typeof value === "boolean") update[`privacy.${key}`] = value;
    }

    const prefs = await UserPreference.findOneAndUpdate(
      { user: req.userId },
      { $set: update, $setOnInsert: { user: req.userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    res.json(prefs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /users/:id  (public profile)
========================= */
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const [user, me, theyGotMyRequest] = await Promise.all([
      User.findById(id).select(PUBLIC_FIELDS).lean(),
      User.findById(req.userId).select("friends friendRequests").lean(),
      User.exists({
        _id: id,
        friendRequests: { $elemMatch: { from: req.userId, status: "pending" } },
      }),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });

    const isSelf = id === req.userId.toString();
    const isFriend = (me?.friends || []).some((f) => String(f) === id);
    const incoming = (me?.friendRequests || []).some(
      (r) => r.status === "pending" && String(r.from) === id,
    );

    user.relation = isSelf
      ? "self"
      : isFriend
        ? "friends"
        : incoming
          ? "incoming"
          : theyGotMyRequest
            ? "requested"
            : "none";

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /users/:id/friend-request     — send
   DELETE /users/:id/friend-request   — cancel one I sent
========================= */
router.post("/:id/friend-request", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    if (id === req.userId.toString()) {
      return res.status(400).json({ message: "Cannot friend yourself" });
    }

    const target = await User.findById(id).select("friendRequests friends");
    if (!target) return res.status(404).json({ message: "User not found" });

    if (target.friends.some((f) => f.toString() === req.userId.toString())) {
      return res.status(409).json({ message: "Already friends" });
    }

    const existing = target.friendRequests.find(
      (r) => String(r.from) === req.userId.toString() && r.status === "pending",
    );
    if (existing) return res.json({ relation: "requested" });

    // They already asked me — treat a request back as an accept.
    const mine = await User.findById(req.userId).select("friendRequests");
    const incoming = mine.friendRequests.find(
      (r) => String(r.from) === id && r.status === "pending",
    );
    if (incoming) {
      await linkFriends(req.userId, id);
      return res.json({ relation: "friends" });
    }

    await User.updateOne(
      { _id: id },
      { $push: { friendRequests: { from: req.userId, status: "pending" } } },
    );

    res.status(201).json({ relation: "requested" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id/friend-request", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    await User.updateOne(
      { _id: id },
      { $pull: { friendRequests: { from: req.userId } } },
    );

    res.json({ relation: "none" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /users/:id/friend-request/accept
   POST /users/:id/friend-request/reject
   :id is the person who sent me the request. Both drop the inbox entry —
   the relationship itself lives in the friends arrays.
========================= */
router.post("/:id/friend-request/accept", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    const me = await User.findById(req.userId).select("friendRequests");
    const pending = me?.friendRequests.some(
      (r) => String(r.from) === id && r.status === "pending",
    );

    if (!pending) return res.status(404).json({ message: "No pending request" });

    await linkFriends(req.userId, id);

    res.json({ relation: "friends" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/friend-request/reject", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    await User.updateOne(
      { _id: req.userId },
      { $pull: { friendRequests: { from: new mongoose.Types.ObjectId(id) } } },
    );

    res.json({ relation: "none" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   DELETE /users/:id/friend  (unfriend, both directions)
========================= */
router.delete("/:id/friend", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);

    await Promise.all([
      User.updateOne({ _id: req.userId }, { $pull: { friends: id } }),
      User.updateOne({ _id: id }, { $pull: { friends: req.userId } }),
    ]);

    res.json({ relation: "none" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Friendship is symmetric, so write both sides and clear any leftover request
// entries in either inbox.
async function linkFriends(a, b) {
  const aId = new mongoose.Types.ObjectId(a);
  const bId = new mongoose.Types.ObjectId(b);

  await Promise.all([
    User.updateOne(
      { _id: aId },
      { $addToSet: { friends: bId }, $pull: { friendRequests: { from: bId } } },
    ),
    User.updateOne(
      { _id: bId },
      { $addToSet: { friends: aId }, $pull: { friendRequests: { from: aId } } },
    ),
  ]);
}

module.exports = router;
