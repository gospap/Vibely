const express = require("express");
const mongoose = require("mongoose");
const { Message, User, conversationKey } = require("../../models");
const { requireAuth } = require("../middleware/auth");
const { paginate } = require("../utils/query");

const router = express.Router();

const badId = (res) => res.status(400).json({ message: "Invalid user id" });

/* =========================
   GET /messages/conversations
   One row per friend: last message, unread count, ordered by recency.
   Friends with no history are included so the list doubles as the chat picker.
========================= */
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const me = await User.findById(req.userId)
      .populate("friends", "username profileImageUrl")
      .lean();

    const friends = me?.friends ?? [];
    if (!friends.length) return res.json([]);

    const keys = friends.map((f) => conversationKey(req.userId, f._id));

    // Latest message per thread + how many of them I have not opened.
    const rows = await Message.aggregate([
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
    ]);

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
    const count = await Message.countDocuments({
      receiver: req.userId,
      read: false,
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
    if (!mongoose.isValidObjectId(userId)) return badId(res);

    const { page, limit, skip } = paginate(req.query, {
      defaultLimit: 30,
      maxLimit: 100,
    });

    const conversationId = conversationKey(req.userId, userId);

    const [items, total, other] = await Promise.all([
      Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationId }),
      User.findById(userId).select("username profileImageUrl").lean(),
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
    if (!mongoose.isValidObjectId(userId)) return badId(res);

    if (userId === req.userId.toString()) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    const text = (req.body.text || "").trim();
    const imageUrl = req.body.imageUrl || undefined;

    if (!text && !imageUrl) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }

    const areFriends = await User.exists({
      _id: req.userId,
      friends: userId,
    });
    if (!areFriends) {
      return res.status(403).json({ message: "You can only message friends" });
    }

    const message = await Message.create({
      sender: req.userId,
      receiver: userId,
      conversationId: conversationKey(req.userId, userId),
      text: text || undefined,
      imageUrl,
    });

    res.status(201).json({ ...message.toObject(), mine: true });
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
    if (!mongoose.isValidObjectId(userId)) return badId(res);

    const result = await Message.updateMany(
      {
        conversationId: conversationKey(req.userId, userId),
        receiver: req.userId,
        read: false,
      },
      { $set: { read: true } },
    );

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
