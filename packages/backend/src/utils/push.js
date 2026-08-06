const { ObjectId } = require("mongodb");
const { getDb } = require("../../db");

// Expo relays to APNs and FCM for us, so there are no platform credentials to
// hold here — just a token per installed app and one HTTP call.
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Expo's documented cap for a single request body.
const CHUNK_SIZE = 100;

// Tokens are stored exactly as the device reported them. Anything that is not
// shaped like an Expo token never reaches the API, so one bad row cannot make
// the whole batch 400.
const isExpoToken = (token) =>
  typeof token === "string" && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

// A token dies when the app is uninstalled or the build is replaced. Expo tells
// us in the receipt, and keeping it around means every later send wastes a slot
// and logs an error, so it is dropped from the user on the spot.
const DEAD_TOKEN_ERRORS = new Set(["DeviceNotRegistered", "InvalidCredentials"]);

async function forget(tokens) {
  if (!tokens.length) return;

  await getDb()
    .collection("users")
    .updateMany(
      { pushTokens: { $in: tokens } },
      { $pull: { pushTokens: { $in: tokens } } },
    );
}

// Fire-and-forget by design: a notification that fails to send must never turn
// a message that was already written into a 500 for the sender.
async function deliver(tokens, message) {
  const valid = [...new Set(tokens.filter(isExpoToken))];
  if (!valid.length) return;

  const dead = [];

  for (const batch of chunk(valid, CHUNK_SIZE)) {
    const body = batch.map((to) => ({
      to,
      sound: "default",
      priority: "high",
      ...message,
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);
      const tickets = json?.data;
      if (!Array.isArray(tickets)) {
        console.error("Push send failed", json ?? res.status);
        continue;
      }

      tickets.forEach((ticket, index) => {
        if (ticket?.status !== "error") return;

        if (DEAD_TOKEN_ERRORS.has(ticket.details?.error)) {
          dead.push(batch[index]);
        } else {
          console.error("Push ticket error", ticket.message);
        }
      });
    } catch (err) {
      console.error("Push send failed", err.message);
    }
  }

  if (dead.length) await forget(dead).catch(() => {});
}

// Reads a dotted path out of the preferences doc. Missing preferences mean the
// user never opened the settings screen, which is not the same as opting out —
// so an absent value is treated as "on".
const enabled = (preferences, path) => {
  const value = path
    .split(".")
    .reduce((node, key) => (node == null ? node : node[key]), preferences);

  return value !== false;
};

/**
 * Notify one user on every device they have the app installed on.
 *
 * @param {ObjectId|string} userId
 * @param {object} message  Expo message fields: title, body, data, badge, channelId
 * @param {object} [options]
 * @param {string} [options.pref]  Dotted path in userpreferences that gates this
 *                                 kind of notification, e.g. "notifications.messages".
 */
async function pushToUser(userId, message, { pref } = {}) {
  if (!userId) return;

  const db = getDb();
  const _id = typeof userId === "string" ? new ObjectId(userId) : userId;

  const user = await db
    .collection("users")
    .findOne({ _id }, { projection: { pushTokens: 1 } });

  const tokens = user?.pushTokens ?? [];
  if (!tokens.length) return;

  if (pref) {
    const preferences = await db
      .collection("userpreferences")
      .findOne({ user: _id }, { projection: { notifications: 1 } });

    // The master switch first, then the per-kind one.
    if (!enabled(preferences, "notifications.push")) return;
    if (!enabled(preferences, pref)) return;
  }

  await deliver(tokens, message);
}

module.exports = { pushToUser, deliver, isExpoToken };
