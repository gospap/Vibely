# Vibely — Table Reservations & Venue Dashboard

Spec for the feature that turns Vibely from a discovery app into something a
venue opens every night. Written against the schema as of 2026-08-04.

**What exists already and is reused:** `Store.owner`, the ownership check
pattern in `events.js`, `requireAuth`/`optionalAuth`, `parseNumber`, the
`badId(res)` helper style, the `Modal`-sheet pattern from `StoreSheet.jsx`.

**What is deliberately *not* here:** payments, push notifications, QR check-in.
Those layer on top once reservations exist — see "Later" at the end.

---

## 1. Data model

### 1.1 New: `Reservation`

Goes in `packages/backend/models/index.js`, after `Review`.

```js
/* =========================
   RESERVATION (TABLE BOOKINGS)
========================= */
const reservationSchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: "Store", index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    // Optional. A booking can be for a specific event or just "a table on
    // Saturday" — venues take both and the sheet shows them together.
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },

    // The venue's *night*, "2026-08-14", not a timestamp. A 03:00 arrival
    // belongs to the night that started the evening before, so a Date here
    // would put half the guests on the wrong sheet. A day key is also what the
    // night-sheet query matches on, so it indexes cleanly.
    dateKey: { type: String, required: true },

    // "23:30" — same string shape as Event.startHour.
    arrivalTime: String,

    partySize: { type: Number, min: 1, max: 20, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "declined", "cancelled", "seated", "no_show"],
      default: "pending",
    },

    // What the guest asked for ("γενέθλια, κοντά στο DJ booth").
    note: String,

    // Denormalised so the night sheet renders without populating User. The
    // phone is typed per booking rather than stored on the profile — the guest
    // decides each time whether the venue gets it.
    contactName: String,
    contactPhone: String,

    // Venue's side of the exchange.
    tableLabel: String,
    responseNote: String,
    respondedAt: Date,
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// The venue's night sheet: one equality match, sorted by arrival.
reservationSchema.index({ store: 1, dateKey: 1, arrivalTime: 1 });

// "My bookings", newest first.
reservationSchema.index({ user: 1, createdAt: -1 });

// One live booking per guest per venue per night. Partial, so a cancelled or
// declined request does not block them from asking again for the same night.
reservationSchema.index(
  { user: 1, store: 1, dateKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "confirmed"] },
    },
  },
);
```

Export it alongside the others.

### 1.2 Added to `storeSchema`

```js
    // Bookings are opt-in per venue. `enabled: false` means the app shows no
    // booking CTA at all — this flag is what a venue is actually buying.
    bookings: {
      enabled: { type: Boolean, default: false },
      maxPartySize: { type: Number, default: 10 },

      // Arrival slots offered, e.g. ["22:00","23:00","00:00","01:00"].
      slots: { type: [String], default: undefined },

      // Total covers (people, not tables) the venue will take per night.
      // null = unlimited, venue judges each request by hand.
      capacityPerNight: Number,

      // Skip the pending state when there is room. Small bars turn this on.
      autoConfirm: { type: Boolean, default: false },

      // How many days ahead guests may book.
      horizonDays: { type: Number, default: 14 },
    },
```

### 1.3 Not changed

`User.type` already has `tenant`. `buildUserPayload` in `auth.js` and the
`/auth/me` handler in `index.js` both return `type`, so the frontend can gate on
`user.type === "tenant"` with no auth work.

---

## 2. Backend

New file `packages/backend/src/routes/reservations.js`, mounted in `index.js`:

```js
app.use("/reservations", require("./src/routes/reservations"));
```

Shared helper at the top of the file, mirroring the inline check in
`events.js:205`:

```js
// A tenant may only ever touch reservations at a store they own. Superadmin
// passes for support work.
async function ownedStore(storeId, req) {
  const store = await Store.findById(storeId).select("owner bookings name").lean();
  if (!store) return null;

  const isOwner = store.owner?.toString() === req.userId.toString();
  if (!isOwner && req.session.user?.type !== "superadmin") return null;

  return store;
}
```

### 2.1 Guest endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/reservations` | Create a request |
| `GET` | `/reservations/me` | `?scope=upcoming\|past`, default `upcoming` |
| `DELETE` | `/reservations/:id` | Cancel my own |

**`POST /reservations`** — body `{ storeId, eventId?, dateKey, arrivalTime, partySize, note?, contactName, contactPhone }`

Validation, in order:
1. `isValidObjectId(storeId)` → 400.
2. Store exists and `store.bookings?.enabled` → 404 / 403 `"Το μαγαζί δεν δέχεται κρατήσεις"`.
3. `dateKey` matches `/^\d{4}-\d{2}-\d{2}$/`, is not before today, and is within
   `bookings.horizonDays` → 400.
4. `partySize` between 1 and `bookings.maxPartySize` → 400.
5. If `bookings.slots` is set, `arrivalTime` must be one of them → 400.
6. If `eventId` given: event exists and `event.hostedBy` equals `storeId` → 400.

Then decide the initial status:

```js
// Auto-confirm only when the venue asked for it *and* the night still has
// room. Otherwise it lands as pending and the venue decides.
let status = "pending";
if (store.bookings.autoConfirm) {
  const remaining = await remainingCovers(store, dateKey);
  if (remaining == null || remaining >= partySize) status = "confirmed";
}
```

Create, then `201` with the reservation. A duplicate hits the partial unique
index — catch `err.code === 11000` and return `409 "Έχεις ήδη κράτηση για αυτή τη βραδιά"`.

**`GET /reservations/me`** — `Reservation.find({ user: req.userId })` with
`dateKey >= todayKey()` for `upcoming` (`<` for `past`), populated with
`store` (`name images area location`) and `event` (`title startHour`), sorted
`dateKey` ascending for upcoming, descending for past.

**`DELETE /reservations/:id`** — only if `user` matches, status is `pending` or
`confirmed`, and `dateKey` is not in the past. Sets `status: "cancelled"` rather
than deleting; the venue needs to see that a confirmed table freed up.

### 2.2 Venue endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/reservations/store/:storeId` | Night sheet. `?dateKey=` , default today |
| `GET` | `/reservations/store/:storeId/summary` | `?from=&to=` counts for the dashboard |
| `PATCH` | `/reservations/:id` | Venue responds |

**`GET /reservations/store/:storeId`** — `ownedStore` or 403. Returns:

```js
{
  dateKey,
  capacityPerNight,       // echoed from store config
  covers: { confirmed, pending },   // summed partySize
  items: [ /* reservations, arrivalTime asc, guest populated */ ],
}
```

Populate `user` with `username profileImageUrl` only — the venue does not need
the guest's full profile.

**`PATCH /reservations/:id`** — body `{ status?, tableLabel?, responseNote? }`.
`ownedStore(reservation.store, req)` or 403. Allowed transitions:

- `pending` → `confirmed` | `declined`
- `confirmed` → `seated` | `no_show` | `declined`
- anything else → 409 `"Μη έγκυρη μετάβαση"`

On `confirmed`, re-check remaining covers and reject with 409 if the night is
now full — two pending requests can race past the same free seats. Stamp
`respondedAt` and `respondedBy`.

`no_show` exists purely so the venue accumulates the data that makes the
analytics tier worth paying for later. It is a door action, not a guest one.

### 2.3 Added to `stores.js`

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/stores/mine` | Stores owned by me. Must be declared **above** `/:id` or Express matches it as an id |
| `GET` | `/stores/:id/availability` | `?dateKey=` → `{ dateKey, slots, remaining, maxPartySize }` |

Availability is public-ish (`optionalAuth`) so the booking sheet can grey out a
full night before the guest fills the form in.

Shared helper, used by both `POST /reservations` and the availability route —
put it in `reservations.js` and require it from `stores.js`, or duplicate the
four lines rather than adding a service layer:

```js
// Covers already committed for a night. Returns null when the venue has not
// set a cap, meaning "no automatic limit, the venue decides".
async function remainingCovers(store, dateKey) {
  if (store.bookings?.capacityPerNight == null) return null;

  const [agg] = await Reservation.aggregate([
    { $match: { store: store._id, dateKey, status: { $in: ["confirmed", "seated"] } } },
    { $group: { _id: null, covers: { $sum: "$partySize" } } },
  ]);

  return store.bookings.capacityPerNight - (agg?.covers ?? 0);
}
```

---

## 3. Frontend

Conventions held to: flat `pages/`, `.styles.js` sibling per screen, raw `fetch`
with `credentials: "include"` written inline, `@/` imports, Greek copy, `T`
tokens from `@/styles/theme`. **No new dependency is needed** — dates are chosen
with chips, not a native picker (see 3.2), so nothing new from Expo is pulled in.

### 3.1 Guest side

**`pages/BookingSheet.jsx` + `.styles.js`** — `Modal` sheet, same shape as
`StoreSheet.jsx` (backdrop + `Pressable` dismiss + `ScrollView`).

```
props: { storeId, store, eventId?, onClose, onBooked }
```

Loads `GET /stores/:id/availability?dateKey=` on mount and whenever the chosen
night changes. Form, top to bottom:

- **Night** — chips: `Απόψε` · `Αύριο` · then weekday + day number up to
  `bookings.horizonDays`, horizontally scrollable.
- **Ώρα άφιξης** — chips from `store.bookings.slots`; a plain `TextInput` in
  `HH:MM` shape if the venue set no slots.
- **Άτομα** — `−` / `+` stepper, clamped to `maxPartySize`.
- **Σημείωση** — multiline `TextInput`, `maxLength={200}`, placeholder
  `"Γενέθλια, τραπέζι κοντά στο DJ… (προαιρετικό)"`.
- **Όνομα + τηλέφωνο** — name prefilled from `user.username`, phone empty.
  Copy under it: `"Το τηλέφωνο το βλέπει μόνο το μαγαζί."`
- Submit `Αίτημα κράτησης`, or `Κράτηση` when `autoConfirm` is on.

On success show the result inline instead of closing — a pending request needs
explaining: `"Στάλθηκε! Το μαγαζί θα απαντήσει σύντομα."` vs
`"Επιβεβαιώθηκε — τραπέζι για 4, Σάββατο 23:00."`

**`pages/MyBookingsScreen.jsx` + `.styles.js`** — pushed onto the stack from
`ProfileScreen`. `FlatList` over `GET /reservations/me`, two segments
(`Επερχόμενες` / `Ιστορικό`). Each row: store image, name, night + arrival,
party size, and a status pill:

| status | label | colour |
| --- | --- | --- |
| `pending` | Σε αναμονή | `T.warning` |
| `confirmed` | Επιβεβαιωμένη | `T.primary` |
| `declined` | Απορρίφθηκε | `T.danger` |
| `cancelled` | Ακυρώθηκε | `T.textFaint` |
| `seated` | Ολοκληρώθηκε | `T.textMuted` |
| `no_show` | Δεν εμφανίστηκε | `T.danger` |

Confirmed rows show `tableLabel` when set. `Ακύρωση` on pending/confirmed rows,
behind an `Alert.alert` confirm.

**Edits to existing pages:**

- `StoreSheet.jsx` — under the existing `Πλοήγηση` button, render a
  `Κράτηση τραπεζιού` button when `store.bookings?.enabled`. Opens `BookingSheet`
  with no `eventId`.
- `EventSheet.jsx` — same button when the host store has bookings on, passing
  `eventId` and defaulting the night to the event's `startDate`.
- `ProfileScreen.jsx` — a row `Οι κρατήσεις μου` navigating to `MyBookings`.

### 3.2 Venue side

**`pages/VenueScreen.jsx` + `.styles.js`** — the tenant home tab.

On mount: `GET /stores/mine`. One store → straight into its sheet; several → a
picker row at the top. Then
`GET /reservations/store/:storeId?dateKey=<selected>`.

Layout:

- **Header** — store name, a night switcher (`‹ Παρ 14 Αυγ ›`).
- **Covers bar** — `18 / 60 άτομα` with a fill bar, plus `4 σε αναμονή`.
- **Σε αναμονή** — pending requests first, each card with guest avatar,
  username, party size, arrival, note, and two buttons: `Αποδοχή` /
  `Απόρριψη`. Accept opens `VenueBookingSheet` so a table can be assigned;
  decline asks for an optional reason.
- **Επιβεβαιωμένες** — confirmed list sorted by arrival, each row tappable to
  mark `Ήρθαν` / `Δεν ήρθαν` at the door.

Pull-to-refresh; no polling. Refetch on `useFocusEffect`.

**`pages/VenueBookingSheet.jsx` + `.styles.js`** — small modal over a single
reservation: table label input, response note, confirm/decline. `PATCH`es and
hands the updated row back through `onUpdated` so the list swaps it in place
rather than refetching — same approach `StoreSheet.submitReview` already takes.

### 3.3 Navigation

`navigation/AppNavigator.jsx` gets two stack screens:

```jsx
<Stack.Screen name="MyBookings" component={MyBookingsScreen} />
```

and the tab set branches on account type. The existing `TABS` array stays as
the guest set; add:

```js
const TENANT_TABS = [
  { name: "Venue", label: "Μαγαζί", Icon: Store },
  { name: "Events", label: "Events", Icon: CalendarDays },
  { name: "Community", label: "Κοινότητα", Icon: Users },
  { name: "Profile", label: "Προφίλ", Icon: User },
];
```

`TabsNavigator` reads `user.type` from `AuthContext` and picks the array plus
the matching `<Tab.Screen>` children. `LiquidGlassTabBar` already lays out from
`state.routes`, so it needs no change beyond reading the right label list —
worth passing the active array down as a prop rather than closing over the
module-level `TABS`.

---

## 4. Build order

Each step is shippable on its own.

1. **Model + guest POST/GET/DELETE.** Test with curl against a store you flip
   `bookings.enabled` on by hand in Mongo.
2. **`BookingSheet` + the `StoreSheet` CTA.** Guests can now request tables;
   the venue reads them in Compass. Ugly, but the loop is real.
3. **`MyBookingsScreen`** + the Profile row.
4. **Venue endpoints + `VenueScreen`.** This is the step that makes a venue a
   customer — do not stop before it.
5. **`EventSheet` CTA**, `seated`/`no_show` door actions, capacity enforcement.

Seed a tenant to develop against: pick a store from the existing seed, create a
user with `type: "tenant"`, set `store.owner` to their `_id` and
`store.bookings.enabled = true`.

---

## 5. Known gaps this spec leaves open

- **The venue is not told a request came in.** Until push exists, `VenueScreen`
  only updates when opened. That is survivable for a pilot with one or two
  venues and unacceptable past that — push is the next feature, not an optional
  polish.
- **No-show protection.** Nothing stops a guest booking five venues for the same
  night. The `no_show` counter is the raw material for a later rule (e.g. block
  requests after two no-shows in 60 days); the rule itself is not specced here.
- **Timezone.** `dateKey` and `todayKey()` are computed server-side. Fine while
  everything is in Greece; revisit before any second country.
- **Uploads still write to local disk**, so venue photos die on redeploy. Not a
  reservations problem, but it blocks the same launch.

## 6. Later, on top of this

Once reservations exist, each of these is a small addition rather than a new
system: ticketed events (`ticketPrice` + a paid `Reservation` variant + QR),
venue analytics (aggregate over reservations + `attendants` + saves), and
`no_show`-driven guest reputation.
