// Every venue starts on a 14-day trial. Kept in one place because it is set in
// three: when a venue is claimed by an owner, by the demo scripts, and by the
// backfill for venues that existed before billing did.
const TRIAL_DAYS = 14;

const startTrial = (now = new Date()) => {
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  return {
    plan: "trial",
    trialStartedAt: now,
    trialEndsAt,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };
};

// A venue is entitled while its trial runs or its subscription is paid up.
// `past_due` still counts on purpose: Stripe retries a failed card for days, and
// dropping a venue off the map over one bounce would strand guests who already
// booked. The cancellation event is what actually takes them down.
const ENTITLED_PLANS = ["active", "past_due"];

const entitlement = (store, now = new Date()) => {
  const sub = store?.subscription ?? {};

  const trialEndsAt = sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;

  // Subscribing ends the trial, whatever the date says. Venues normally pay
  // before their 14 days are up, so a trial that is merely still in the future
  // would otherwise keep reporting a paid venue as "on trial" — and every
  // screen ranks trial above active, so it would offer to sell a subscription
  // to someone who already bought one.
  const onTrial =
    !!trialEndsAt && trialEndsAt > now && !sub.stripeSubscriptionId;

  return {
    entitled: onTrial || ENTITLED_PLANS.includes(sub.plan),
    plan: sub.plan ?? "none",
    onTrial,
    trialEndsAt,
    // Rounded up, so the last day still reads "1 μέρα ακόμα" rather than
    // flipping to zero at lunchtime.
    trialDaysLeft: onTrial ? Math.ceil((trialEndsAt - now) / 86400000) : 0,
    currentPeriodEnd: sub.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
  };
};

module.exports = { TRIAL_DAYS, startTrial, entitlement, ENTITLED_PLANS };
