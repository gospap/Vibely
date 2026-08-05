const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("../../db");
const { requireAuth } = require("../middleware/auth");
const {
  escapeRegex,
  normalizeText,
  paginate,
  currentNightKey,
} = require("../utils/query");

const router = express.Router();

// Never leak the hash or the request inbox of other people.
const PUBLIC_FIELDS = {
  username: 1,
  profileImageUrl: 1,
  bio: 1,
  gender: 1,
  favouriteGenres: 1,
  createdAt: 1,
};

// Written on insert because there are no schema defaults to fall back on.
const DEFAULT_PREFERENCES = {
  theme: "dark",
  language: "el",
  // Kilometres. Used to filter the map / events feed around the user.
  searchRadiusKm: 5,
  notifications: {
    push: true,
    email: false,
    friendRequests: true,
    eventReminders: true,
    messages: true,
  },
  privacy: {
    showAttendance: true,
    // Whether friends can see which venue you checked into. Separate from
    // showAttendance on purpose: declaring you are going to an event is a
    // public intention, while a check-in says where you are standing.
    showCheckIns: true,
    discoverable: true,
  },
};

// Anyone who has turned check-in sharing off is dropped before their name can
// reach a friend's screen. Read straight from preferences rather than cached on
// the user, so switching it off takes effect on the next request.
async function checkInsHiddenFor(userIds) {
  if (!userIds.length) return new Set();

  const rows = await getDb()
    .collection("userpreferences")
    .find({ user: { $in: userIds }, "privacy.showCheckIns": false })
    .project({ user: 1 })
    .toArray();

  return new Set(rows.map((r) => r.user.toString()));
}

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

    const db = getDb();
    const users = db.collection("users");

    const me = await users.findOne(
      { _id: req.userId },
      { projection: { friends: 1, friendRequests: 1 } },
    );

    const filter = { _id: { $ne: req.userId } };

    if (q) {
      // usernameLower is the accent-stripped mirror, so "ελενη" finds "Ελένη".
      filter.usernameLower = new RegExp(escapeRegex(normalizeText(q)));
    }

    const [found, total] = await Promise.all([
      users
        .find(filter)
        .project(PUBLIC_FIELDS)
        .sort({ usernameLower: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      users.countDocuments(filter),
    ]);

    // One pass over my own doc instead of a query per result row.
    const friendIds = new Set((me?.friends || []).map(String));
    const incomingIds = new Set(
      (me?.friendRequests || [])
        .filter((r) => r.status === "pending")
        .map((r) => String(r.from)),
    );

    const sentTo = await users
      .find({
        _id: { $in: found.map((u) => u._id) },
        friendRequests: { $elemMatch: { from: req.userId, status: "pending" } },
      })
      .project({ _id: 1 })
      .toArray();
    const sentIds = new Set(sentTo.map((u) => String(u._id)));

    const items = found.map((u) => ({
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
    const users = getDb().collection("users");

    const me = await users.findOne(
      { _id: req.userId },
      { projection: { friends: 1 } },
    );

    if (!me?.friends?.length) return res.json([]);

    const friends = await users
      .find({ _id: { $in: me.friends } })
      .project(PUBLIC_FIELDS)
      .toArray();

    res.json(friends);
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
    const users = getDb().collection("users");

    const me = await users.findOne(
      { _id: req.userId },
      { projection: { friendRequests: 1 } },
    );

    const pending = (me?.friendRequests || [])
      .filter((r) => r.status === "pending" && r.from)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (!pending.length) return res.json([]);

    const senders = await users
      .find({ _id: { $in: pending.map((r) => r.from) } })
      .project(PUBLIC_FIELDS)
      .toArray();

    const byId = new Map(senders.map((u) => [u._id.toString(), u]));

    res.json(
      pending
        .map((r) => ({
          user: byId.get(r.from.toString()),
          createdAt: r.createdAt,
        }))
        .filter((r) => r.user),
    );
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
    const db = getDb();
    const now = new Date();

    const events = await db
      .collection("events")
      .find({
        attendants: req.userId,
        $or: [
          { endDate: { $gte: now } },
          { endDate: null, startDate: { $gte: now } },
        ],
      })
      .sort({ startDate: 1 })
      .toArray();

    if (!events.length) return res.json([]);

    // Stands in for populate: one extra query, then stitched in JS. The shape
    // the profile card wants is flatter than the raw host document anyway.
    const hostIds = [...new Set(events.map((e) => e.hostedBy).filter(Boolean))];
    const hosts = await db
      .collection("stores")
      .find({ _id: { $in: hostIds } })
      .project({ name: 1, images: 1, area: 1 })
      .toArray();

    const byId = new Map(hosts.map((s) => [s._id.toString(), s]));

    res.json(
      events.map((e) => {
        const host = e.hostedBy ? byId.get(e.hostedBy.toString()) : null;

        return {
          ...e,
          store: host
            ? {
                _id: host._id,
                name: host.name,
                image: host.images?.[0],
                area: host.area,
              }
            : null,
        };
      }),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /users/me/loyalty
   Every stamp card I have going, for the wallet on the profile screen.
========================= */
router.get("/me/loyalty", requireAuth, async (req, res) => {
  try {
    const db = getDb();

    const rows = await db
      .collection("checkins")
      .aggregate([
        { $match: { user: req.userId } },
        {
          $group: {
            _id: "$store",
            stamps: { $sum: 1 },
            lastVisit: { $max: "$dateKey" },
          },
        },
        { $sort: { lastVisit: -1 } },
      ])
      .toArray();

    if (!rows.length) return res.json([]);

    const stores = await db
      .collection("stores")
      .find({ _id: { $in: rows.map((r) => r._id) } })
      .project({ name: 1, images: 1, area: 1, category: 1, loyalty: 1 })
      .toArray();

    const byId = new Map(stores.map((s) => [s._id.toString(), s]));
    const tonight = currentNightKey();

    const cards = rows
      .map((row) => {
        const store = byId.get(row._id.toString());
        if (!store?.loyalty?.enabled) return null;

        const target = store.loyalty.stampsForReward ?? 6;

        return {
          store: {
            _id: store._id,
            name: store.name,
            image: store.images?.[0],
            area: store.area,
            category: store.category,
          },
          stamps: row.stamps,
          stampsForReward: target,
          rewardLabel: store.loyalty.rewardLabel || null,
          progress: target > 0 ? row.stamps % target : 0,
          rewardsEarned: target > 0 ? Math.floor(row.stamps / target) : 0,
          lastVisit: row.lastVisit,
          checkedInTonight: row.lastVisit === tonight,
        };
      })
      .filter(Boolean);

    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /users/me/friends/tonight
   Which venues my friends are at or heading to tonight. The reason anyone
   opens a nightlife app at 22:00.

   Reservations are deliberately NOT a source here: a booking is a transaction
   with the venue (it carries a phone number), not a social signal. Only the
   two things a user knowingly makes visible are used, each behind its own
   switch.
========================= */
router.get("/me/friends/tonight", requireAuth, async (req, res) => {
  try {
    const db = getDb();

    const me = await db
      .collection("users")
      .findOne({ _id: req.userId }, { projection: { friends: 1 } });

    const friendIds = me?.friends ?? [];
    if (!friendIds.length) return res.json([]);

    const tonight = currentNightKey();
    const now = new Date();

    const [checkIns, hiddenCheckIns, attending, hiddenAttendance] =
      await Promise.all([
        db
          .collection("checkins")
          .find({ user: { $in: friendIds }, dateKey: tonight })
          .toArray(),

        checkInsHiddenFor(friendIds),

        db
          .collection("events")
          .find({
            attendants: { $in: friendIds },
            $or: [
              { endDate: { $gte: now } },
              { endDate: null, startDate: { $gte: now } },
            ],
          })
          .project({ hostedBy: 1, attendants: 1, title: 1 })
          .toArray(),

        db
          .collection("userpreferences")
          .find({
            user: { $in: friendIds },
            "privacy.showAttendance": false,
          })
          .project({ user: 1 })
          .toArray()
          .then((rows) => new Set(rows.map((r) => r.user.toString()))),
      ]);

    // storeId -> { friendId -> "here" | "going" }. Standing in the venue beats
    // planning to be there, so a check-in overwrites a plan.
    const byStore = new Map();

    const put = (storeId, userId, state) => {
      const key = storeId.toString();
      if (!byStore.has(key)) byStore.set(key, new Map());

      const people = byStore.get(key);
      if (state === "here" || !people.has(userId.toString())) {
        people.set(userId.toString(), state);
      }
    };

    for (const event of attending) {
      if (!event.hostedBy) continue;
      for (const attendant of event.attendants || []) {
        const id = attendant.toString();
        if (!friendIds.some((f) => f.toString() === id)) continue;
        if (hiddenAttendance.has(id)) continue;
        put(event.hostedBy, attendant, "going");
      }
    }

    for (const checkIn of checkIns) {
      if (hiddenCheckIns.has(checkIn.user.toString())) continue;
      put(checkIn.store, checkIn.user, "here");
    }

    if (!byStore.size) return res.json([]);

    const storeIds = [...byStore.keys()].map((id) => new ObjectId(id));
    const peopleIds = [
      ...new Set(
        [...byStore.values()].flatMap((people) => [...people.keys()]),
      ),
    ].map((id) => new ObjectId(id));

    const [stores, people] = await Promise.all([
      db
        .collection("stores")
        .find({ _id: { $in: storeIds } })
        .project({ name: 1, images: 1, area: 1, location: 1, category: 1 })
        .toArray(),
      db
        .collection("users")
        .find({ _id: { $in: peopleIds } })
        .project({ username: 1, profileImageUrl: 1 })
        .toArray(),
    ]);

    const personById = new Map(people.map((p) => [p._id.toString(), p]));

    res.json(
      stores
        .map((store) => {
          const entries = [...byStore.get(store._id.toString()).entries()];

          return {
            store: {
              _id: store._id,
              name: store.name,
              image: store.images?.[0],
              area: store.area,
              category: store.category,
              location: store.location,
            },
            here: entries.filter(([, s]) => s === "here").length,
            friends: entries
              .map(([id, state]) => ({ ...personById.get(id), state }))
              .filter((f) => f.username),
          };
        })
        // Busiest with friends first — that is the one worth showing.
        .sort((a, b) => b.friends.length - a.friends.length),
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
      // Keep the search mirror in step with the name on every write path.
      update.usernameLower = normalizeText(update.username);
    }

    if (update.dateOfBirth) update.dateOfBirth = new Date(update.dateOfBirth);

    if (update.gender && !["male", "female", "other"].includes(update.gender)) {
      return res.status(400).json({ message: "Invalid gender" });
    }

    update.updatedAt = new Date();

    const user = await getDb()
      .collection("users")
      .findOneAndUpdate(
        { _id: req.userId },
        { $set: update },
        { returnDocument: "after" },
      );

    if (!user) return res.status(404).json({ message: "User not found" });

    delete user.password;
    delete user.hashedpassword;
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
    const preferences = getDb().collection("userpreferences");

    // Created on first read so the client always gets a full object.
    await preferences.updateOne(
      { user: req.userId },
      { $setOnInsert: { user: req.userId, ...DEFAULT_PREFERENCES } },
      { upsert: true },
    );

    res.json(await preferences.findOne({ user: req.userId }));
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

    const preferences = getDb().collection("userpreferences");

    // Two steps rather than one upsert: mongo refuses an update that touches
    // both `notifications` (via $setOnInsert) and `notifications.push` (via
    // $set), so the defaults are settled first and the toggles applied after.
    await preferences.updateOne(
      { user: req.userId },
      { $setOnInsert: { user: req.userId, ...DEFAULT_PREFERENCES } },
      { upsert: true },
    );

    const prefs = await preferences.findOneAndUpdate(
      { user: req.userId },
      { $set: { ...update, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

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
    if (!ObjectId.isValid(id)) return badId(res);

    const users = getDb().collection("users");
    const targetId = new ObjectId(id);

    const [user, me, theyGotMyRequest] = await Promise.all([
      users.findOne({ _id: targetId }, { projection: PUBLIC_FIELDS }),
      users.findOne(
        { _id: req.userId },
        { projection: { friends: 1, friendRequests: 1 } },
      ),
      users.countDocuments(
        {
          _id: targetId,
          friendRequests: {
            $elemMatch: { from: req.userId, status: "pending" },
          },
        },
        { limit: 1 },
      ),
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
    if (!ObjectId.isValid(id)) return badId(res);

    if (id === req.userId.toString()) {
      return res.status(400).json({ message: "Cannot friend yourself" });
    }

    const users = getDb().collection("users");
    const targetId = new ObjectId(id);

    const target = await users.findOne(
      { _id: targetId },
      { projection: { friendRequests: 1, friends: 1 } },
    );
    if (!target) return res.status(404).json({ message: "User not found" });

    if ((target.friends || []).some((f) => f.toString() === req.userId.toString())) {
      return res.status(409).json({ message: "Already friends" });
    }

    const existing = (target.friendRequests || []).find(
      (r) => String(r.from) === req.userId.toString() && r.status === "pending",
    );
    if (existing) return res.json({ relation: "requested" });

    // They already asked me — treat a request back as an accept.
    const mine = await users.findOne(
      { _id: req.userId },
      { projection: { friendRequests: 1 } },
    );
    const incoming = (mine?.friendRequests || []).find(
      (r) => String(r.from) === id && r.status === "pending",
    );
    if (incoming) {
      await linkFriends(req.userId, targetId);
      return res.json({ relation: "friends" });
    }

    await users.updateOne(
      { _id: targetId },
      {
        $push: {
          friendRequests: {
            from: req.userId,
            status: "pending",
            createdAt: new Date(),
          },
        },
      },
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
    if (!ObjectId.isValid(id)) return badId(res);

    await getDb()
      .collection("users")
      .updateOne(
        { _id: new ObjectId(id) },
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
    if (!ObjectId.isValid(id)) return badId(res);

    const me = await getDb()
      .collection("users")
      .findOne({ _id: req.userId }, { projection: { friendRequests: 1 } });

    const pending = (me?.friendRequests || []).some(
      (r) => String(r.from) === id && r.status === "pending",
    );

    if (!pending) return res.status(404).json({ message: "No pending request" });

    await linkFriends(req.userId, new ObjectId(id));

    res.json({ relation: "friends" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/:id/friend-request/reject", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) return badId(res);

    await getDb()
      .collection("users")
      .updateOne(
        { _id: req.userId },
        { $pull: { friendRequests: { from: new ObjectId(id) } } },
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
    if (!ObjectId.isValid(id)) return badId(res);

    const users = getDb().collection("users");
    const otherId = new ObjectId(id);

    await Promise.all([
      users.updateOne({ _id: req.userId }, { $pull: { friends: otherId } }),
      users.updateOne({ _id: otherId }, { $pull: { friends: req.userId } }),
    ]);

    res.json({ relation: "none" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Friendship is symmetric, so write both sides and clear any leftover request
// entries in either inbox.
async function linkFriends(aId, bId) {
  const users = getDb().collection("users");

  await Promise.all([
    users.updateOne(
      { _id: aId },
      { $addToSet: { friends: bId }, $pull: { friendRequests: { from: bId } } },
    ),
    users.updateOne(
      { _id: bId },
      { $addToSet: { friends: aId }, $pull: { friendRequests: { from: aId } } },
    ),
  ]);
}

module.exports = router;
