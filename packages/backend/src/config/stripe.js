const Stripe = require("stripe");

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "Warning: STRIPE_SECRET_KEY not set. Billing routes will answer 503.",
  );
}

// No explicit apiVersion: the SDK pins its own, and getSubscriptionPeriod in
// the webhook copes with both the old and new shapes of the period fields.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

module.exports = stripe;
