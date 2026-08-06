const express = require("express");
const { ObjectId } = require("mongodb");
const stripe = require("../config/stripe");
const { getDb } = require("../../db");
const { requireAuth } = require("../middleware/auth");
const { entitlement } = require("../utils/trial");

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

// Where Stripe sends the browser back to once it is done.
//
// Falls back to the host this very request arrived on, which is what makes the
// whole flow work on a dev machine: the app already reaches the API on a LAN IP
// or localhost, so the return trip resolves to the same place with nothing to
// configure. An explicit CLIENT_URL still wins, which is what a deployed build
// uses. Without either, Stripe is handed "undefined/billing" and refuses to
// create the session at all.
const returnBase = (req) =>
  process.env.CLIENT_URL?.replace(/\/+$/, "") ||
  `${req.protocol}://${req.get("host")}`;

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
   GET /billing
   Where Stripe sends the browser back to after Checkout.

   Checkout is opened in a web browser on the phone, so the return trip is a
   plain page load rather than anything the app can intercept — without this it
   lands on Express's "Cannot GET /billing". Deliberately unauthenticated: it
   states an outcome Stripe already decided and reads nothing.
========================= */
router.get("/", (req, res) => {
  const ok = req.query.status !== "cancelled";

  const title = ok ? "Έτοιμο!" : "Ακυρώθηκε";
  const message = ok
    ? "Η συνδρομή ενεργοποιήθηκε. Μπορείς να κλείσεις αυτή τη σελίδα."
    : "Δεν χρεώθηκες. Μπορείς να κλείσεις αυτή τη σελίδα.";

  res.type("html").send(`<!doctype html>
<html lang="el">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Vibely</title>
    <style>
      body {
        margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #0d0d0f; color: #fff; text-align: center; padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .mark { font-size: 56px; line-height: 1; margin-bottom: 16px; }
      h1 { font-size: 22px; margin: 0 0 8px; }
      p { color: rgba(255,255,255,0.62); font-size: 15px; line-height: 22px; margin: 0 0 24px; }
      a {
        display: inline-block; padding: 13px 22px; border-radius: 10px;
        background: #4F7CFF; color: #fff; text-decoration: none; font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div>
      <div class="mark">${ok ? "✓" : "✕"}</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="vibely://">Επιστροφή στη Vibely</a>
    </div>
  </body>
</html>`);
});

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
      success_url: `${returnBase(req)}/billing?status=success`,
      cancel_url: `${returnBase(req)}/billing?status=cancelled`,
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
      return_url: `${returnBase(req)}/billing`,
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

    res.json(
      stores.map((store) => {
        // entitlement() rather than a second copy of the same rules: this route
        // had its own, the two drifted, and a paid venue ended up reported as
        // still on trial here while the rest of the app disagreed.
        const state = entitlement(store);

        return {
          store: { _id: store._id, name: store.name, image: store.images?.[0] },
          plan: state.plan === "none" ? "trial" : state.plan,
          entitled: state.entitled,
          onTrial: state.onTrial,
          trialEndsAt: state.trialEndsAt,
          trialDaysLeft: state.trialDaysLeft,
          currentPeriodEnd: state.currentPeriodEnd,
          cancelAtPeriodEnd: state.cancelAtPeriodEnd,
          hasSubscription: !!store.subscription?.stripeSubscriptionId,
          // Null means this venue rides the customer's default card.
          paymentMethodId: store.subscription?.defaultPaymentMethodId ?? null,
        };
      }),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET /billing/payment-methods
   Every card saved on the account, default first.

   Answers an empty list rather than an error for each "nothing to show" case —
   no Stripe configured, no customer yet, no card on file — because this feeds a
   panel on the profile screen, and a venue that has not subscribed should read
   "no card", not "something went wrong".
========================= */
router.get("/payment-methods", requireAuth, async (req, res) => {
  try {
    if (!stripe) return res.json([]);

    const user = await getDb()
      .collection("users")
      .findOne({ _id: req.userId }, { projection: { stripeCustomerId: 1 } });

    if (!user?.stripeCustomerId) return res.json([]);

    const [customer, methods] = await Promise.all([
      stripe.customers.retrieve(user.stripeCustomerId),
      stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: "card",
        limit: 10,
      }),
    ]);

    if (customer.deleted) return res.json([]);

    // What Stripe actually charges. Everything else on the account is saved but
    // idle, and the UI has to be able to say which is which.
    const defaultId =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : (customer.invoice_settings?.default_payment_method?.id ?? null);

    const cards = methods.data
      .filter((method) => method.card)
      .map((method) => ({
        id: method.id,
        brand: method.card.brand,
        last4: method.card.last4,
        expMonth: method.card.exp_month,
        expYear: method.card.exp_year,
        // What the cardholder typed at checkout — the only thing that tells two
        // otherwise identical cards apart at a glance.
        name: method.billing_details?.name ?? null,
        isDefault: method.id === defaultId,
      }));

    // Default in front. With no default set, whatever Stripe listed first is
    // the one it would fall back to anyway.
    cards.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

    res.json(cards);
  } catch (err) {
    console.error("Payment method lookup failed:", err.message);
    res.json([]);
  }
});

/* =========================
   PUT /billing/stores/:storeId/payment-method
   Bill one venue on a specific card.

   All of an owner's venues sit on one Stripe customer and charge its default
   card unless told otherwise. Setting `default_payment_method` on the single
   subscription overrides that for that venue alone, which is how one owner can
   put two bars on two different cards.
========================= */
router.put(
  "/stores/:storeId/payment-method",
  requireAuth,
  requireStripe,
  async (req, res) => {
    try {
      const store = await ownedStore(req.params.storeId, req);
      if (!store) return res.status(403).json({ message: "Not your store" });

      const subscriptionId = store.subscription?.stripeSubscriptionId;
      if (!subscriptionId) {
        return res
          .status(409)
          .json({ message: "Το μαγαζί δεν έχει ενεργή συνδρομή" });
      }

      const { paymentMethodId } = req.body;
      if (!paymentMethodId) {
        return res.status(400).json({ message: "Λείπει η κάρτα" });
      }

      const user = await getDb()
        .collection("users")
        .findOne({ _id: req.userId }, { projection: { stripeCustomerId: 1 } });

      // The card has to be one of *this* account's. Without the check, any
      // payment method id posted here would be attached to someone else's
      // subscription.
      const method = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (!method || method.customer !== user?.stripeCustomerId) {
        return res.status(403).json({ message: "Άγνωστη κάρτα" });
      }

      await stripe.subscriptions.update(subscriptionId, {
        default_payment_method: paymentMethodId,
      });

      // Written locally too rather than waiting on the webhook: the venue just
      // tapped this and the list has to redraw against it straight away.
      await getDb()
        .collection("stores")
        .updateOne(
          { _id: store._id },
          { $set: { "subscription.defaultPaymentMethodId": paymentMethodId } },
        );

      res.json({ ok: true, paymentMethodId });
    } catch (err) {
      console.error("Set store card failed:", err.message);
      res.status(500).json({ message: "Stripe error" });
    }
  },
);

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
