const express = require("express");
const { ObjectId } = require("mongodb");
const stripe = require("../config/stripe");
const { getDb } = require("../../db");

const router = express.Router();

// Newer Stripe API versions moved the period dates off the subscription and
// onto its first item. Read both, so the integration survives a version bump.
function subscriptionPeriod(subscription) {
  const item = subscription.items?.data?.[0];

  const toDate = (seconds) => (seconds ? new Date(seconds * 1000) : null);

  return {
    start: toDate(subscription.current_period_start ?? item?.current_period_start),
    end: toDate(subscription.current_period_end ?? item?.current_period_end),
  };
}

// Which venue a subscription pays for. Set on the checkout session and carried
// on the subscription itself, because one customer can hold several.
const storeIdOf = (subscription) => subscription?.metadata?.storeId ?? null;

// Which subscription an invoice is for.
//
// `subscription` was removed from the Invoice object in Stripe's 2025-03-31
// API version and moved under `parent` — and the SDK here pins a version well
// past that. Reading only the old field means every invoice event looks like a
// one-off payment, so renewals never mark the venue active again and no charge
// is ever recorded. All three known shapes are read: the removed top-level
// field, the current `parent`, and the line items, which carry it when the
// invoice itself does not.
const invoiceSubscriptionId = (invoice) => {
  const asId = (value) =>
    typeof value === "string" ? value : (value?.id ?? null);

  const direct = asId(invoice.subscription);
  if (direct) return direct;

  const parent = asId(invoice.parent?.subscription_details?.subscription);
  if (parent) return parent;

  for (const line of invoice.lines?.data ?? []) {
    const fromLine = asId(
      line.parent?.subscription_item_details?.subscription ?? line.subscription,
    );
    if (fromLine) return fromLine;
  }

  return null;
};

// The card this particular subscription charges. Null means it falls back to
// whatever the customer's default is, which is the normal case until a venue
// picks a specific card for itself.
const paymentMethodOf = (subscription) => {
  const method = subscription?.default_payment_method;
  return typeof method === "string" ? method : (method?.id ?? null);
};

const setStoreSubscription = async (storeId, fields) => {
  if (!storeId || !ObjectId.isValid(storeId)) return;

  await getDb()
    .collection("stores")
    .updateOne(
      { _id: new ObjectId(storeId) },
      {
        $set: Object.fromEntries(
          Object.entries(fields).map(([k, v]) => [`subscription.${k}`, v]),
        ),
      },
    );
};

/* =========================
   POST /stripe/webhook
   Mounted before express.json() in index.js: the signature is computed over the
   raw body, so anything that has already parsed it breaks verification.
========================= */
router.post("/", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Payment system not configured" });
  }

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return res.status(500).json({ error: "Webhook not configured" });
  }

  let event;

  // Verifying the signature is what stops anyone posting themselves a free
  // subscription — never skip it, even in development.
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      endpointSecret,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (!session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );
        const period = subscriptionPeriod(subscription);

        await setStoreSubscription(storeIdOf(subscription), {
          plan: "active",
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          cancelAtPeriodEnd: false,
          defaultPaymentMethodId: paymentMethodOf(subscription),
        });

        console.log(`Subscription active for store ${storeIdOf(subscription)}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const period = subscriptionPeriod(subscription);

        await setStoreSubscription(storeIdOf(subscription), {
          plan: subscription.status,
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          // Changing the card in Stripe's own portal fires this too, so the
          // venue's screen agrees with Stripe either way round.
          defaultPaymentMethodId: paymentMethodOf(subscription),
        });

        console.log(
          `Subscription ${subscription.status} for store ${storeIdOf(subscription)}`,
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        // The venue drops off the map from here: entitlement() only counts
        // active, past_due, or a trial that has not run out.
        await setStoreSubscription(storeIdOf(subscription), {
          plan: "canceled",
          stripeSubscriptionId: null,
          cancelAtPeriodEnd: false,
        });

        console.log(`Subscription canceled for store ${storeIdOf(subscription)}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (!subscriptionId) break;

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);

        // Left as past_due, which still counts as entitled — Stripe retries for
        // days, and pulling a venue off the map over one bounced card would
        // strand guests who already booked. Stripe cancels it in the end, and
        // that is the event that actually takes them down.
        await setStoreSubscription(storeIdOf(subscription), {
          plan: "past_due",
          lastPaymentFailedAt: new Date(),
          paymentAttempts: invoice.attempt_count ?? 0,
        });

        console.warn(
          `Payment failed for store ${storeIdOf(subscription)} (attempt ${invoice.attempt_count})`,
        );
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (!subscriptionId) break;

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        const storeId = storeIdOf(subscription);
        const line = invoice.lines?.data?.[0];

        await setStoreSubscription(storeId, {
          plan: "active",
          paymentAttempts: 0,
          ...(line?.period
            ? {
                currentPeriodStart: new Date(line.period.start * 1000),
                currentPeriodEnd: new Date(line.period.end * 1000),
              }
            : {}),
        });

        // Kept locally so the venue can see its own history without a round
        // trip to Stripe.
        const customer = await stripe.customers.retrieve(invoice.customer);
        const userId = customer.metadata?.userId;

        await getDb()
          .collection("invoices")
          .updateOne(
            { stripeInvoiceId: invoice.id },
            {
              $set: {
                stripeInvoiceId: invoice.id,
                user: userId && ObjectId.isValid(userId) ? new ObjectId(userId) : null,
                store: storeId && ObjectId.isValid(storeId) ? new ObjectId(storeId) : null,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: "paid",
                periodStart: new Date(invoice.period_start * 1000),
                periodEnd: new Date(invoice.period_end * 1000),
                paidAt: new Date(),
                invoiceUrl: invoice.hosted_invoice_url,
                invoicePdf: invoice.invoice_pdf,
              },
            },
            { upsert: true },
          );

        console.log(
          `Invoice paid for store ${storeId}: ${invoice.amount_paid / 100} ${invoice.currency}`,
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

module.exports = router;
