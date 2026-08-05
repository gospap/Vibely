const express = require("express");
const { ObjectId } = require("mongodb");
const stripe = require("../config/stripe");
const { getDb } = require("../../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Vibely bills per venue, not per account: a tenant with three bars pays three
// times, because each one gets its own map pin, bookings and analytics. The
// Stripe *customer* is still the owner, so all their venues sit on one card and
// one portal — only the subscriptions are separate.
const requireStripe = (req, res, next) => {
  if (!stripe) {
    return res.status(503).json({ message: "Το Stripe δεν έχει ρυθμιστεί" });
  }
  next();
};

// The venue must be one this account owns before it can be paid for.
async function ownedStore(storeId, req) {
  if (!ObjectId.isValid(storeId)) return null;

  const store = await getDb()
    .collection("stores")
    .findOne({ _id: new ObjectId(storeId) });

  if (!store) return null;

  const isOwner = store.owner?.toString() === req.userId.toString();
  if (!isOwner && req.session.user?.type !== "superadmin") return null;

  return store;
}

// Get or create the Stripe customer for this account, re-creating it if the
// stored id has since been deleted in the Stripe dashboard.
async function customerFor(req) {
  const users = getDb().collection("users");
  const user = await users.findOne({ _id: req.userId });

  const create = async () => {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.username,
      metadata: { userId: user._id.toString() },
    });

    await users.updateOne(
      { _id: user._id },
      { $set: { stripeCustomerId: customer.id } },
    );

    return customer.id;
  };

  if (!user.stripeCustomerId) return create();

  try {
    const existing = await stripe.customers.retrieve(user.stripeCustomerId);
    // A deleted customer still resolves, it just comes back flagged.
    return existing.deleted ? create() : user.stripeCustomerId;
  } catch (err) {
    if (err.code === "resource_missing") return create();
    throw err;
  }
}

/* =========================
   POST /billing/checkout/:storeId
   Start a subscription for one venue.
========================= */
router.post("/checkout/:storeId", requireAuth, requireStripe, async (req, res) => {
  try {
    const store = await ownedStore(req.params.storeId, req);
    if (!store) return res.status(403).json({ message: "Not your store" });

    if (store.subscription?.stripeSubscriptionId) {
      return res
        .status(409)
        .json({ message: "Το μαγαζί έχει ήδη συνδρομή — άνοιξε το portal" });
    }

    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(503).json({ message: "Δεν έχει οριστεί τιμή" });
    }

    const customer = await customerFor(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      payment_method_collection: "always",
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true, required: "if_supported" },
      customer_update: { name: "auto", address: "auto" },
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      // Which venue this pays for. Read back in the webhook — a customer can
      // have several subscriptions, one per bar.
      subscription_data: {
        metadata: {
          storeId: store._id.toString(),
          storeName: store.name,
        },
      },
      success_url: `${process.env.CLIENT_URL}/billing?status=success`,
      cancel_url: `${process.env.CLIENT_URL}/billing?status=cancelled`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout session error:", err);
    res.status(500).json({ message: "Stripe error" });
  }
});

/* =========================
   POST /billing/portal
   Manage card, invoices and cancellation — Stripe hosts all of it.
========================= */
router.post("/portal", requireAuth, requireStripe, async (req, res) => {
  try {
    const user = await getDb().collection("users").findOne({ _id: req.userId });

    if (!user?.stripeCustomerId) {
      return res.status(400).json({ message: "Καμία συνδρομή ακόμα" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Customer portal error:", err);
    res.status(500).json({ message: "Stripe error" });
  }
});

/* =========================
   GET /billing/mine
   Subscription state for each of my venues. Read straight from the database —
   the webhook is the source of truth, so this never calls Stripe.
========================= */
router.get("/mine", requireAuth, async (req, res) => {
  try {
    const stores = await getDb()
      .collection("stores")
      .find({ owner: req.userId })
      .project({ name: 1, images: 1, subscription: 1 })
      .sort({ name: 1 })
      .toArray();

    const now = new Date();

    res.json(
      stores.map((store) => {
        const sub = store.subscription ?? {};
        const trialEndsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
        const onTrial = !!trialEndsAt && trialEndsAt > now;

        return {
          store: { _id: store._id, name: store.name, image: store.images?.[0] },
          plan: sub.plan ?? "trial",
          entitled: onTrial || ["active", "past_due"].includes(sub.plan),
          onTrial,
          trialEndsAt,
          trialDaysLeft: onTrial
            ? Math.ceil((trialEndsAt - now) / 86400000)
            : 0,
          currentPeriodEnd: sub.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
          hasSubscription: !!sub.stripeSubscriptionId,
        };
      }),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /billing/invoices
========================= */
router.get("/invoices", requireAuth, async (req, res) => {
  try {
    const invoices = await getDb()
      .collection("invoices")
      .find({ user: req.userId })
      .sort({ paidAt: -1 })
      .limit(24)
      .toArray();

    res.json(invoices);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
