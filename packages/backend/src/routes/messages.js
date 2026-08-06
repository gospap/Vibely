const express = require("express");
const { ObjectId } = require("mongodb");
const { getDb } = require("../../db");
const { requireAuth } = require("../middleware/auth");
const { paginate } = require("../utils/query");
const { emitToUser } = require("../realtime");
const { pushToUser } = require("../utils/push");

const router = express.Router();

const badId = (res) => res.status(400).json({ message: "Invalid user id" });

// Stable key for a pair of users, whichever way round they are passed. Lets a
// thread be fetched with one indexed equality match instead of an $or over both
// directions.
const conversationKey = (a, b) => [a.toString(), b.toString()].sort().join(":");

// The friends there is actually a thread to open with.
//
// A friends array outlives the accounts it points at — nothing removes an id
// when a user is deleted — so it can name people who are no longer there. Their
// messages are still in the collection addressed to you, and counting them
// gives a badge with nothing behind it: no row in the conversation list, no
// thread to open, no way to ever mark it read. Every count and every list here
// is scoped through this so they can never disagree.
async function liveFriends(db, userId, projection) {
  const me = await db
    .collection("users")
    .findOne({ _id: userId }, { projection: { friends: 1 } });

  const ids = me?.friends ?? [];
  if (!ids.length) return [];

  return db
    .collection("users")
    .find({ _id: { $in: ids } })
    .project(projection)
    .toArray();
}

// The banner the receiver sees when the app is not open. `data` is what the app
// gets when the notification is tapped, and it carries everything ChatScreen
// needs to open the thread without a round trip first.
async function notify(sender, receiverId, message) {
  const unread = await getDb()
    .collection("messages")
    .countDocuments({ receiver: receiverId, read: false });

  await pushToUser(
    receiverId,
    {
      title: sender?.username ?? "Νέο μήνυμα",
      body: message.text || "📷 Φωτογραφία",
      // iOS shows this on the app icon; without it the badge never clears down
      // from whatever the last notification set.
      badge: unread,
      channelId: "messages",
      data: {
        type: "message",
        userId: sender._id.toString(),
        username: sender.username ?? "",
        profileImageUrl: sender.profileImageUrl ?? null,
      },
    },
    { pref: "notifications.messages" },
  );
}

/* =========================
   GET /messages/conversations
   One row per friend: last message, unread count, ordered by recency.
   Friends with no history are included so the list doubles as the chat picker.
========================= */
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const db = getDb();

    const friends = await liveFriends(db, req.userId, {
      username: 1,
      profileImageUrl: 1,
    });

    if (!friends.length) return res.json([]);

    const keys = friends.map((f) => conversationKey(req.userId, f._id));

    // Latest message per thread + how many of them I have not opened.
    const rows = await db
      .collection("messages")
      .aggregate([
        { $match: { conversationId: { $in: keys } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$conversationId",
            last: { $first: "$$ROOT" },
            unread: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$receiver", req.userId] },
                      { $eq: ["$read", false] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const byKey = new Map(rows.map((r) => [r._id, r]));

    const conversations = friends.map((friend) => {
      const row = byKey.get(conversationKey(req.userId, friend._id));
      const last = row?.last;

      return {
        user: friend,
        unread: row?.unread ?? 0,
        lastMessage: last
          ? {
              _id: last._id,
              text: last.text,
              imageUrl: last.imageUrl,
              createdAt: last.createdAt,
              mine: last.sender.toString() === req.userId.toString(),
            }
          : null,
      };
    });

    // Threads with activity first, newest at the top; untouched friends after.
    conversations.sort((a, b) => {
      const at = a.lastMessage ? new Date(a.lastMessage.createdAt) : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.createdAt) : 0;
      return bt - at;
    });

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /messages/unread-count  (tab badge)
========================= */
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const db = getDb();

    // Scoped exactly like the conversation list. A badge the user cannot clear
    // by opening something is worse than no badge at all.
    const friends = await liveFriends(db, req.userId, { _id: 1 });
    if (!friends.length) return res.json({ count: 0 });

    const count = await db.collection("messages").countDocuments({
      receiver: req.userId,
      read: false,
      sender: { $in: friends.map((f) => f._id) },
    });

    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /messages/:userId
   A thread, newest page first. The client reverses for display.
========================= */
router.get("/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) return badId(res);

    const { page, limit, skip } = paginate(req.query, {
      defaultLimit: 30,
      maxLimit: 100,
    });

    const db = getDb();
    const conversationId = conversationKey(req.userId, userId);

    const [items, total, other] = await Promise.all([
      db
        .collection("messages")
        .find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("messages").countDocuments({ conversationId }),
      db
        .collection("users")
        .findOne(
          { _id: new ObjectId(userId) },
          { projection: { username: 1, profileImageUrl: 1 } },
        ),
    ]);

    if (!other) return res.status(404).json({ message: "User not found" });

    res.json({
      user: other,
      items: items.map((m) => ({
        ...m,
        mine: m.sender.toString() === req.userId.toString(),
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
   POST /messages/:userId
   Text and/or photo. Friends only — that is the whole point of the request
   flow, so an unapproved user cannot DM you.
========================= */
router.post("/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) return badId(res);

    if (userId === req.userId.toString()) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    const text = (req.body.text || "").trim();
    const imageUrl = req.body.imageUrl || undefined;

    if (!text && !imageUrl) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const db = getDb();
    const receiver = new ObjectId(userId);

    // The friendship check and the sender's own card in one round trip: the
    // receiving app needs a name and an avatar to put on the notification it
    // shows for a thread that is not open.
    const me = await db.collection("users").findOne(
      { _id: req.userId },
      { projection: { username: 1, profileImageUrl: 1, friends: 1 } },
    );

    const areFriends = (me?.friends ?? []).some((id) => id.equals(receiver));

    if (!areFriends) {
      return res.status(403).json({ message: "You can only message friends" });
    }

    const from = {
      senderName: me.username ?? "",
      senderImageUrl: me.profileImageUrl ?? null,
    };

    const now = new Date();
    const doc = {
      sender: req.userId,
      receiver,
      conversationId: conversationKey(req.userId, receiver),
      text: text || undefined,
      imageUrl,
      read: false,
      createdAt: now,
      updatedAt: now,
    };

    const { insertedId } = await db.collection("messages").insertOne(doc);
    const message = { ...doc, _id: insertedId };

    // The socket only ever pushes what this route already saved, so there is
    // one write path and a dropped connection costs a notification, not a
    // message.
    emitToUser(userId, "message:new", { ...message, ...from, mine: false });

    // Answer the sender before doing any of the notification work: a slow Expo
    // call must not hold up the send.
    res.status(201).json({ ...message, mine: true });

    // The socket only reaches an app that is open. A backgrounded phone has no
    // JS running and no connection, so this is the only thing that gets there.
    notify(me, receiver, message).catch((err) =>
      console.error("Message push failed", err.message),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   POST /messages/:userId/read  (mark their messages to me as seen)
========================= */
router.post("/:userId/read", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) return badId(res);

    const result = await getDb()
      .collection("messages")
      .updateMany(
        {
          conversationId: conversationKey(req.userId, userId),
          receiver: req.userId,
          read: false,
        },
        { $set: { read: true, updatedAt: new Date() } },
      );

    // Let the other side turn their ticks blue without polling for it.
    if (result.modifiedCount) {
      emitToUser(userId, "message:read", { by: req.userId.toString() });
    }

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
