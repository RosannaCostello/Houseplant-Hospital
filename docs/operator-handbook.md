# Houseplant Hospital — Operator Handbook

**Audience:** Rosanna, shop staff, and any AI given this file  
**Live app:** https://houseplanthospital.hildaedinburgh.workers.dev  
**Last updated:** 23 September 2026

This is the **ops source of truth** for using the live app — terminology, workflows, and do/don’ts. It is not a developer setup guide.

If something in the app and this file disagree, **trust the app**, then ask Jack to fix the handbook.

---

## How to use this document

- **Staff:** skim the glossary, then follow the daily workflows.
- **AI / agents:** use glossary terms exactly as written; follow do/don’t; do not invent screens or steps not listed here.
- **Builders / Cursor agents:** keep this file current whenever staff-facing behaviour changes (see [Living updates](#living-updates)).

---

## Living updates

1. Update this file **in the same session** as any change that affects how staff use the app (labels, lanes, check-in, pests, collect, payments, propagation, Analytics meaning, roles).
2. Prefer amending the glossary and workflows here over creating parallel “how to use” docs.
3. Mark **Admin only** and **Not for day-to-day ops** clearly.
4. Do **not** put deploy, migrations, env vars, or Linear build process in this file — those live in `docs/SETUP.md` / `docs/DEPLOY.md`.
5. Pure engineering refactors with no operator impact: skip handbook changes (and say N/A).

---

## At a glance

Houseplant Hospital is Hilda’s **in-store plant treatment ops app**. Staff check plants in, move them through treatment lanes, record pests and notes, collect them, and (admins) review performance.

| Still used outside this app | Notes |
|---|---|
| **Shopify** | Retail catalogue + source of treatment prices; POS for Hospital checkout |
| **Mailchimp** | Customer emails (app sends events; journeys are built in Mailchimp) |
| **Acuity** | Booking (can create incomplete check-ins when wired) |
| **Brother labels** | Physical plant labels from the Brother printer (via Mac Mini print-bridge). Layout: **customer name** large, **species** smaller underneath. One label prints automatically when check-in is completed; use **Reprint label** on Update plant if needed. If the printer/queue was offline, labels stay queued in the Hospital app (not dumped all at once when the printer comes back). |

**Zoho Creator** is replaced for day-to-day Hospital ops. Historic Zoho plants may appear in Analytics as collected history.

---

## Roles

| Role | Can use |
|---|---|
| **Staff** (signed in) | Check-in, Dashboard (kanban), plant / drop-off detail, pests, notes, tips, propagate, collect / payment actions |
| **Admin** | Everything staff can, plus **Analytics** (bottom nav) and **Settings** (Account menu, top right) |

Non-admins who open `/app/analytics` or `/settings` are sent back to the Dashboard.

Bottom nav (typical): **Check-in** · **Dashboard** · **Analytics** (admin). **Settings** and **Log out** are under the **Account** pill (top right). Customers is available via links but not in the bottom nav.

---

## Glossary (canonical terms)

Use these words when talking about the app.

| Term | Meaning |
|---|---|
| **Customer** | Person bringing plants in (name, email, **phone** — required at check-in). |
| **Drop-off** | One check-in occasion for a customer (may include several plants). Formerly called a visit in the staff UI; the database still uses `visit`. |
| **Plant** | One plant on a drop-off. The board is organised by **plants**, not drop-offs. |
| **Check-in** (flow) | Creating a new drop-off: customer → plants → photos. |
| **Incomplete check-in** | A draft drop-off not finished yet (still on plants or photos step). Shown in the Incomplete lane. |
| **Dashboard** | Kanban board of active plants by lane. Use the search box to filter by customer **name**, **email**, or **pest type**. When search is active, tap **Cancel search** to show the full board again. From any plant’s **⋯** menu, **Search customer** fills the search box with that customer’s email and closes the menu. On iPad, **tap the photo or customer name** to **Update plant**; use the **⋯** menu for lane moves (drag between lanes also works, but tap is the reliable path). When **Stacking cards** is on (Settings), plants from the same drop-off in the same lane appear as a fan stack — use the **left/right arrows** to move between plants. Plant cards show an **outpatient zone** chip when set. When pests are Yes, a gold pests badge shows the bug icon alone, or the icon plus pest type name when a type is set. |
| **Customer Care Card** | Public page for a whole **drop-off** (all plants on that visit). Staff open it from Update plant via **Open Care Card** (`/hh/care/…`). No login. Shows Hospital status names (Quarantine, In Surgery, Ready for collection, etc.), journey timeline, photo, and pests when Yes (or still assessing when Not sure) with pest type when set. **Treatment notes** and **care tips** only after the plant is Outpatient, Collected, or Dead (hidden earlier while still in draft). No customer name, size, internal notes, payment, or zone. Old **QR case** plant links redirect here. |
| **Update plant** | Opens the plant record as an **overlay** on the current page (not a separate screen). Check-in stays full screen so you can hand the iPad to the customer. **Species** can be edited (rare corrections; save on blur). Treatment notes autosave on pause and when you tap **Close** — wait for “Saving…” if you just typed. On **Outpatient** plants, **Treatment notes** appear first (highlighted) above the photo. From Update plant, **View drop-off** closes the overlay and opens the drop-off page. **Open Care Card** previews the customer page for this drop-off. |
| **Stacking cards** | Admin Settings toggle (default on). Same drop-off, same lane → fan stack on the Dashboard with **← / →** arrows to step through plants. |
| **Lane / status** | Where a plant sits on the board (see [Lanes](#lanes)). |
| **Pests / Bugs found** | Whether pests were found. At **check-in** and **Update plant**: **Yes / No / Not sure**. **Yes** → Quarantine + pests price + pests badge. **No** → Check-in lane + standard price + no badge. **Not sure** → Quarantine + standard price + no badge. Outpatient requires Yes or No (Not sure must be resolved). Changing to **Yes** later (from No or Not sure): auto-**Quarantine** if still in Check-in, Mailchimp **`bugs_found`**, pests reprice. If the drop-off was already **Paid**, status becomes **Part paid** and a **pests surcharge** cart appears in Shopify POS **Pending check-ins** (balance only). If still unpaid / pay-at-collection, the pending cart rebuilds with the full pests product instead. |
| **Pest type** | Catalogue type (e.g. Fungus gnats, Thrips) when pests are **Yes** — at **check-in** or on **Update plant**. **Required before Outpatient** when pests are Yes. Admins manage types and a treatment-notes **paragraph** in Settings. Selecting a type saves it on the plant and, if treatment notes are still blank, fills them with that paragraph. On the Dashboard card, the gold pests badge shows the type next to the bug icon when set. |
| **Pest treatments** | Treatment slots on plant detail (Treatment 1 / 2 / 3, then **Add another treatment** if more are needed). Shown when pests are **Yes** (or were ever Yes and not currently No). **Never** shown when pests are currently **No**. At least three are required before Outpatient only when that rule applies — never when pests are No. |
| **Outpatient zone** | Required when moving a plant to **Outpatient** (e.g. Office, Quarantine). Staff choose the zone in the confirm dialog before Yes. On **Update plant** for Outpatient plants, the zone can also be set or changed with the **Outpatient zone** dropdown (saves immediately). Shown as a chip on the Dashboard card. Admins manage the list in Settings. |
| **Internal notes** | Staff notes for **that plant** (optional). Editable on **Update plant** until **Collected**. Also shown on the drop-off page. Not the same as **Treatment notes**. |
| **Treatment notes** | Notes on the plant (required before Outpatient). Shown to the customer on the **Customer Care Card** after Outpatient / Collected / Dead. Not embedded in Mailchimp emails (emails link to the Care Card instead). |
| **Care tips** | Aftercare advice for the customer as **Water / Leaves / Light** on plant detail. **At least one** tip is required before Outpatient; the others may be left blank. Each dropdown has **Other…** for a **one-off** custom tip on that plant only (not added to Settings). Tips appear on the **Customer Care Card** (with treatment notes) after Outpatient / Collected / Dead — not inside Mailchimp email bodies. |
| **Surgery sign-off** | While a plant is **In Surgery**, choose who completed surgery from the staff dropdown. Required before **Outpatient**. Initials show on Outpatient and Collected cards. |
| **Final price** | Price locked on the plant at collection. Used for **treatment revenue**. |
| **Treatment revenue** | Sum of final prices on plants collected in a period. **Revenue, not profit.** |
| **Propagation** | Creating a child plant from a plant in Surgery (pests allowed). Also a **lane** and a plant **category**. |
| **Size** | Plant size band: **Mini**, S, M, L, XL (never “XS” — use Mini). Matches Shopify Mini for the smallest band. |
| **Pay at collection** | Customer pays when collecting, not at check-in. These visits **do** appear in Shopify POS **Pending check-ins** (with the customer name) so staff can load the cart on the till. Propagation visits also appear here. |
| **Part paid** | Standard (or full) payment already taken, but a **pests surcharge** balance is still owed after pests were set to Yes later. Shows an amber **Part paid** badge and **Pests found after payment** alert on the card and Update plant. Load the surcharge cart from POS **Pending check-ins**; when paid, status returns to **Paid**. Collect is blocked while Part paid (same as other unpaid states) unless staff confirm paid another way. |
| **POS / Shopify POS** | Shop till extension used to take Hospital payment. Open **Pending check-ins** for queued carts, Pay at collection / propagation visits, **and** Part paid pests-surcharge carts. The list refreshes itself every few seconds. Queued/loaded POS carts that stay unpaid for **24 hours** drop off the list (marked cancelled/unpaid). **Pay at collection** and **Part paid** are not auto-cleared by that timer. |
| **Outpatient** | Plant is ready for collection. |
| **Outpatient ready** | This plant has pests answered Yes or No (if standard), treatment notes, **at least one** care tip, **surgery sign-off** (if in Surgery), **pest type** (if pests are Yes), and — if pests currently require it — at least three pest treatments — so it can move to Outpatient. |
| **Outpatient partial** | On a multi-plant drop-off, one plant is in Outpatient but siblings are not yet ready. Staff still move plants one by one; the app emails Mailchimp a “partial” event until the last sibling is ready (then a full ready-to-collect event). Staff do not manage this as a separate screen. |
| **Collected** | Plant has gone home. Terminal status — **view only** (notes, tips, pests, treatments, photo retake, **Reprint label**, and actions locked). |
| **Dead** | Plant did not survive treatment. Terminal status. Moving to Dead asks you to confirm the customer has already been emailed. |
| **Total customers** (Analytics) | Distinct customers with a drop-off check-in in the selected period. |
| **New / Returning customers** | First-ever drop-off in this period vs had an earlier drop-off before this period. |

### Lanes

Board order (left → right):

1. **Incomplete check-ins** — drafts not finished  
2. **Check-in** — just admitted  
3. **Quarantine**  
4. **Propagation** — propagation children recovering  
5. **In Surgery** — active treatment  
6. **Outpatient** — ready to collect  
7. **Collected**  
8. **Dead**

**Allowed moves (high level):**

- Check-in → Quarantine or In Surgery  
- Quarantine → In Surgery  
- Propagation → In Surgery  
- In Surgery → Outpatient or Dead  
- Outpatient → Collected  
- Collected / Dead → nowhere (terminal)

---

## Daily workflows

### Sign in

1. Open the live URL.  
2. Sign in with your Hospital staff account.  
3. You land on the **Dashboard**.

### Check in a customer (new drop-off)

**iPad tip:** Hand the iPad to the customer for this flow. Primary buttons are large; **Return ipad to staff member** sits above **Discard**. Staff chrome (Dashboard / Account) is de-emphasised so customers are less likely to leave mid-flow. The iPad software keyboard cannot be made smaller by the app — in landscape it is large. While typing, the form sits in the remaining space above the keyboard (nav/header hide). To make the keyboard itself smaller, **pinch the keyboard** to undock/float it.

1. Bottom nav → **Check-in**.  
2. Enter **customer** details (phone required) → **Return ipad to staff member** (creates an incomplete draft). **Marketing emails** starts **checked** (customer is opted in unless they uncheck — **Uncheck to opt out**).  
3. **Plants** step: use **Plant 1 / Plant 2 / …** tabs for multi-plant drop-offs (**Add another plant** opens a new tab). Each plant: **size** and **Any pests visible on this plant?** — **Yes / No / Not sure** (shows **Please select** until one is chosen). When pests are **Yes**, an optional **Pest type** dropdown appears. Species and internal notes are on the Photos step.  
4. If Shopify pricing is on: choose **Go to checkout** (queue for POS) or **Pay at collection**. After **Go to checkout**, a modal opens with the **Shopify POS** app icon — tap it to open POS, then the **Houseplant Hospital** tile, load the check-in, and take payment. Use **Stay on this page** if you need **Pay at collection** instead. The modal and check-in page close when payment is taken (or after Pay at collection). Finish photos later from the **Incomplete check-ins** lane if needed.  
5. **Photos** step (when you continue or resume): per plant — **species** (optional, typeahead), **internal notes** (required, at least 12 characters), then photo → **Complete check-in**. The first **Take photo** may ask for camera access — tap **Allow**. Further photos in the same check-in should not ask again (the app keeps the camera session open while you stay on Photos). If Safari still asks every time: **aA** → **Website Settings** → **Camera** → **Allow** (not Ask). Also check iPad **Settings → Apps → Safari → Camera** is not blocking the site.  
6. Plants appear on the **Dashboard**. Each plant’s label prints automatically when check-in completes (if the Mini/printer is online; otherwise it queues and can be reprinted). Plants marked **pests Yes** or **Not sure** land in **Quarantine** (not Check-in).

You can leave mid-flow and resume from the **Incomplete check-ins** lane (**Complete check-in**) or discard the draft (**Discard** — irreversible).

### Update plant (esp. Surgery / dirty hands)

1. On the Dashboard, tap the plant **photo** or **customer name** (or **Update plant** from **⋯**). From **⋯** you can also **Search customer** to filter the board to that email.  
2. Edit species, pests (Yes / No / Not sure), **pest type** (required before Outpatient when pests are Yes), **internal notes**, treatment notes, care tips, treatments as needed. While **In Surgery**, set **Surgery was completed on this plant by** before Outpatient. Species and internal notes save on blur / autosave. Treatment notes save automatically; **Close** waits for a pending save. On **Outpatient**, set or change **Outpatient zone** at the top (saves on change), and **Treatment notes** are in a yellow highlight so collection handoff is obvious. The plant card shows milestone dates (check-in, quarantine, surgery, propagation, outpatient, collection) as the plant moves. Use **Reprint label** to print again (greyed out once the plant is **Collected**). Use **Open Care Card** to preview the customer-facing drop-off page (opens in a new tab).  
3. Use **⋯** (or drag) to move lanes — not the photo tap.  
4. **View drop-off** opens the shared drop-off page (closes the Update plant overlay first).

### Species at check-in (Photos step)

- Optional free text on step 3 (**Photos**).  
- After typing about **2 characters**, suggestions appear from species already recorded on past plants.  
- Tap a suggestion to fill the field, or keep typing a new species — new values are always allowed.

### Find a plant on the Dashboard

1. Use the **Search by name, email, or pest** box above the lanes, or **Search customer** from a plant’s **⋯** menu.  
2. As you type, plant cards and incomplete drafts that do not match are hidden.  
3. Tap **Cancel search** to clear search and show the full board.  
4. Each lane has a **Newest / Oldest** toggle. Most lanes sort by check-in date. The **Collected** lane sorts by **collection date** (newest = collected most recently).  
5. If **Stacking cards** is on (Settings), use the **left/right arrows** on a stack when several plants from one drop-off share a lane.

### Move a plant on the board

1. On the Dashboard, open the plant’s **⋯** menu (or drag the card onto another lane).  
2. Choose an **allowed** next lane.  
3. Confirm any prompts (e.g. Outpatient readiness, **outpatient zone**, collection payment). Moving to **Outpatient** requires choosing a zone before Yes.  
4. Moving to **In Surgery** opens **Update plant** so you can start notes immediately.

### Before Outpatient (standard plants)

The app blocks Outpatient until the plant is **Outpatient ready**. If staff try to move anyway, **Update plant** opens with a short message and a **red outline** on each missing field (same idea as incomplete internal notes at check-in). Outlines clear as each field is completed.

- **Pests** answered **Yes or No** (Not sure is not enough)  
- **Treatment notes** filled  
- **Surgery sign-off** — staff member selected on the plant card while **In Surgery**  
- **Care tips** — choose **at least one** of Water, Leaves, or Light (others may be blank; **Other…** is one-off for that plant only)  
- If pests are currently **Yes**: a **pest type** must be selected on Update plant (or at check-in)  
- If pests are currently **Yes** (or were ever Yes and not currently No): **at least three** pest treatments recorded. If pests are currently **No**, treatments are hidden and not required.

When confirming the move, staff must also select an **outpatient zone**.

Propagation plants skip the pests requirement for this gate. Plants that never had pests do not need pest treatments.

On multi-plant drop-offs, move each plant when it is ready. Sibling plants still in earlier lanes mean **Outpatient partial** for email purposes — no extra staff step.

### Quarantine pest treatments

On plant detail (when the plant is in **Quarantine** or has ever had pests):

1. For **Treatment 1**, **2**, and **3**: choose a treatment type from the dropdown — confirm in the dialog to lock it with date and time. Cancel returns the dropdown to “Select treatment…”.  
2. After all three are recorded, use **Add another treatment** if a further round is needed (Treatment 4, 5, …).  
3. Recorded treatments **cannot be undone** (no clear / change).  
4. Treatment types are managed by admins in **Settings → Pest treatment options**.  
5. On **Collected** plants the section is view-only.

### Plant photos on plant detail

1. Tap the main photo (or a thumbnail) to open a **fullscreen** view — close with the button, backdrop, or Escape.  
2. Use **Retake photo** to replace the latest photo (camera or library).  
3. **Collected** plants: fullscreen view is allowed; retake is disabled.

### Mailchimp — hospital Transactional mail + collection journeys

The app queues plant events in `mailchimp_events`. Delivery splits by **Route A** (HIL-140):

| Channel | What it sends | Who receives it |
|---|---|---|
| **Mailchimp Transactional** (Mandrill) | Hospital service emails: check-in, Quarantine, Surgery, Outpatient (+ partial / reminder), Dead, Propagated, pests found | **Every** hospital customer (marketing opt-in **not** required) |
| **Marketing Events API → Customer Journey** | **`plant_collected` only** | Used to start **nurture** journeys — gate those journeys to subscribed / `newsletter` |

Hospital Transactional emails are thin status notes with a **View your Care Card** button. Treatment notes and care tips are on the Care Card, not in the email body.

**Ops:** deactivate Marketing Journeys that used to fire on hospital events (check-in, surgery, outpatient, etc.) so you are not confused by dormant triggers. Keep / build the **`plant_collected`** nurture journey with a consent filter.

#### Event names the app still queues

| Event name | Delivery | When the app fires it |
|---|---|---|
| `plant_checked_in` | Transactional | Check-in completes (one event per plant) |
| `plant_quarantined` | Transactional | Plant moves to Quarantine (including pests Yes at check-in) |
| `plant_in_surgery` | Transactional | First plant on a drop-off moves to In Surgery (later sibling plants entering Surgery do **not** fire again) |
| `plant_propagated` | Transactional | Staff propagates a plant in Surgery (creates a child in Propagation) |
| `plant_outpatient` | Transactional | Plant moves to Outpatient **and** the drop-off is fully ready to collect |
| `plant_outpatient_partial` | Transactional | Plant moves to Outpatient but sibling plants still block the ready-to-collect notice |
| `plant_outpatient_reminder` | Transactional | Daily cron: plant has been Outpatient for 14+ days (repeats every 14 days while still Outpatient) |
| `plant_dead` | Transactional | Plant moves to Dead |
| `bugs_found` | Transactional | Pests set to Yes on plant detail (after check-in) |
| `plant_collected` | Marketing Journey | Plant moves to Collected |

#### Event properties (on Marketing Journey events / payload)

Still stored on queued rows and sent with `plant_collected` Journey triggers. Empty / unused properties are omitted.

| Property | Meaning |
|---|---|
| `visit_id` | Drop-off UUID (stored as visit id) |
| `plant_id` | Plant UUID (for `plant_propagated`: the **source** plant) |
| `customer_id` | Customer UUID |
| `plant_name` | Plant display name (if set) |
| `care_card_url` | Absolute link to the visit **Customer Care Card** (`/hh/care/…`) — use this as the CTA in journey emails |
| `previous_status` | Status before the change (status / bugs events) |
| `new_status` | Status after the change (status events) |
| `bugs_found` | `"true"` / `"false"` when sent with the `bugs_found` event |
| `awaiting_plant_count` | How many sibling plants still block collection (`plant_outpatient_partial` only) |
| `child_plant_id` | New propagation plant UUID (`plant_propagated` only) |
| `size` | Propagation size band Mini/S/M/L/XL (`plant_propagated` only) |

**Thin emails (HIL-139):** hospital Transactional emails (Route A) are short status updates with a Care Card button — they do not embed treatment notes / care tips. For the **`plant_collected`** Marketing Journey, use `care_card_url` as a CTA if you include a short service step before nurture; remove any old `treatment_notes_*` / `care_tips_*` blocks.

**Ops:** Marketing Journeys for hospital events other than collection should be **off** (Transactional replaced them). Keep collection nurture gated to subscribed / `newsletter`.

#### Audience merge fields (contact profile)

Set on the Mailchimp contact when check-in sync upserts the member (not event properties):

| Merge field tag | Contents |
|---|---|
| `NAME` | Customer full name (`First Last`) |
| `PHONE` | Customer phone (when present) |

Email address is the contact identity (not a merge field the app sets).

#### Tags the app applies

| Tag | When |
|---|---|
| `houseplant_hospital` | Every successful check-in sync |
| `repeat_hospital_customer` | Customer already has more than one drop-off |
| `newsletter` | Marketing consent checked at check-in |
| `bugs_treatment` | `bugs_found` event (pests Yes on plant detail) |

#### Marketing consent → Mailchimp status (HIL-126)

- **Marketing emails** checkbox at check-in (default on) adds the `newsletter` tag when checked.
- If the customer is already on the Hilda audience as **unsubscribed** or **transactional** and they leave marketing consent **checked**, the app tries to move them back to **subscribed** so hospital Journey emails can send again.
- Contacts Mailchimp has marked **cleaned**, or that Mailchimp blocks for compliance (hard bounce / forced unsubscribe review), stay as they are — check-in still completes; they may not get Journey mail until fixed in Mailchimp.
- Leaving the checkbox **unchecked** does **not** unsubscribe an already-subscribed contact (status is left alone). Hospital treatment updates are still *intended* to send via Journeys when Mailchimp allows the contact to receive them.

#### Quarantine email delay (Mailchimp journey)

When pests are **Yes** at check-in, the plant goes straight into **Quarantine**, so the app fires both the check-in event and `plant_quarantined` at the same time. The Mailchimp **quarantine** journey intentionally **delays** that email so the customer is not hit with two messages at once. Quarantine is not time-sensitive for the customer, so the delay is expected — do not treat a late quarantine email as a bug, and do not remove the delay without a product decision.

### Pests (bugs found)

- Set at check-in (Yes / No / Not sure). **Yes** or **Not sure** places the plant in **Quarantine** when check-in completes (**Yes** also queues a quarantine Mailchimp event — see **Quarantine email delay** above).  
- Can be changed on plant detail until **Collected** (Clear answer exists in UI). Clearing Yes does **not** remove the “ever had pests” flag used for treatments / Outpatient.  
- **Propagation plants** do not show the pests control. If they were created from a parent with pests (Yes or Not sure), they start as pests **Yes** (badge + pricing).
- Yes → pests treatment pricing when Shopify/rules apply.
- Changing to **Yes** after check-in: if still in **Check-in**, plant moves to **Quarantine**; Mailchimp **`bugs_found`** fires; if the drop-off was **Paid**, it becomes **Part paid** and a pests-surcharge line appears in POS Pending (see **Part paid**).

### Propagate

1. Plant must be **standard**, in **In Surgery**, and not already propagated. Pests **Yes** / **No** / **Not sure** are all allowed.
2. Use **Propagate** → pick child **size** → confirm.
3. A **new drop-off** with one child plant appears in **Propagation**. If the source had pests Yes or Not sure, the child is pests **Yes**; if the source was No, the child is No.
4. Source plant can only propagate **once**.

### Collect / payment

- **Outpatient → Collected** may prompt for payment if the drop-off is still unpaid (**including Part paid**).
  1. Find the order in **Shopify POS** under the customer name and take payment, **or**
  2. Confirm **Customer paid another way** (second confirm — cannot be undone). That marks the **drop-off** as settled for Hospital ops.
- **Guarantee plants:** use Shopify discount code **`GUARANTEE26`** (100% off) on the Hospital charge in POS when a plant is covered by the guarantee — prefer this over “paid another way” so Shopify stays the source of truth.
- For **Part paid** (pests found after standard was paid): take the **pests surcharge** cart from POS **Pending check-ins** before collecting.
- Collecting a plant stamps **final price** from the treatment estimate when none was stored yet (no separate collection form).
- Payment is **drop-off-level**: collecting one plant on a multi-plant drop-off does not require siblings to be collected first.
- **Collected** is final for that plant — staff can still open the record to view details, but cannot edit notes, care tips, pests, or status.
- Pricing on plant detail shows the treatment estimate / recorded final price.
- On **Outpatient** / **Collected** plant detail, **Time in Surgery** shows how long that plant spent in In Surgery (from status history).
- **In Surgery → Dead** asks you to confirm the customer has already been emailed.

### Find a customer or plant

- Open the plant from the Dashboard card.  
- Customer pages exist via links from plant/drop-off detail (Customers is not in the bottom nav).

### Incomplete check-ins

- Leftmost lane on the Dashboard.  
- Shows step (waiting for plant details / photos).  
- **Complete check-in** resumes; **Discard** deletes the draft.  
- An **Acuity booking** badge may appear if the draft came from a booking webhook.

---

## Admin only

### Analytics (`/app/analytics`)

Period filters (Today, This week, Last 30 days, This month, This year, Custom) compare to the matching previous period.

**Performance metric cards** (two rows of three on wide screens)

| Card | Meaning |
|---|---|
| **Treatment revenue** | Sum of final prices on plants **collected** in the period (not profit). |
| **Average collected value** | Average final price across collected plants with a price. |
| **Avg time in Surgery** | Average time plants spent in **In Surgery** for stints that **ended** in the period (moved to Outpatient or Dead). **App data only** — Zoho historic imports are excluded. **Lower is better.** |
| **Median turnaround** | Middle check-in → collection time among plants collected in the period (**lower is better**). |
| **Plants checked in** | Plants on drop-offs checked in during the period. |
| **Plants collected** | Plants whose collection completed in the period. |

Info (**i**) icons explain each metric and chart. Charts compare current vs previous period (fainter lines = previous).

Also on Analytics: customers / pests / propagations summaries, live **Current operations** (lanes, incomplete check-ins, payments, oldest active plants). Current operations is a **live snapshot** — not filtered by the date range.

### Settings (`/settings`)

- View / manage size-band pricing.  
- **Sync from Shopify** refreshes standard, pests, and propagation prices from Shopify products.  
- **Dashboard → Stacking cards** — turn same-drop-off stacks (with arrow controls) on or off (default on).  
- **Staff** — add first name and surname for surgery sign-off dropdowns (initials derived automatically).  
- **Pest treatment options** — add, edit, or remove treatment types used on plant detail.  
- **Outpatient zones** — add, edit, or remove zones staff must choose when moving to Outpatient (seeded with Office and Quarantine).  
- **Pest types** — add, edit, or remove pest type labels and the treatment-notes paragraph used when notes are blank.  
- **Care tips options** — add, edit, or delete Water / Leaves / Light choices used on plant detail.  
- **Treatment notes placeholder** — edit the hint text shown in the treatment notes box.

On plant detail, care tips save automatically once **at least one** tip is chosen (others may stay Select… / blank), as:

```
Water: …
Leaves: …
Light: …
```

Blank lines still appear in storage with an empty value after the label. Tips with text appear on the **Customer Care Card** after Outpatient / Collected / Dead (not in Mailchimp email bodies).

Older free-text care tips that do not match this format show as a read-only note until staff re-select tips and save.

---

## What staff should not do

- Do not treat **treatment revenue** as profit or as full Shopify shop sales.  
- Do not invent prices outside the size + pests (or propagation) rules.  
- Do not discard incomplete check-ins unless you mean to delete that draft forever.  
- Do not expect to reverse **Collected** or **Dead** in the app.  
- Do not run Zoho import / database scripts unless Jack asks (engineering only).  
- Do not build Mailchimp journeys “in the app” — that is Mailchimp’s UI.

---

## Common questions

**Why do Collected and Average collected value sometimes differ in count?**  
Average only uses plants with a recorded final price. Historic imports without a CSV price are backfilled from size + pests rules; if anything is still blank, it is excluded from the average.

**What is Total customers?**  
Distinct people who checked in during the period. New + Returning should add up to Total.

**Are “unassessed” pests normal?**  
Live check-in requires pests Yes/No. Blank pests on old Zoho history were treated as **No**. Analytics no longer emphasises “unassessed.”

**Does Analytics include historic Zoho plants?**
Yes for most Performance metrics (as collected history; synthetic collection date = check-in + 14 days). They are hidden from the day-to-day ops board. **Avg time in Surgery** is an exception: it uses status history from **app** drop-offs only and excludes Zoho imports.

**Who sees Analytics?**  
Admins only.

---

## Pointers (not for daily ops)

| Doc | For |
|---|---|
| [SETUP.md](./SETUP.md) | Developers: local env, migrations, Zoho scripts |
| [DEPLOY.md](./DEPLOY.md) | Developers: Cloudflare deploy |
| [project-status.md](./project-status.md) | Builders: what’s shipped |
| [Houseplant-Hospital-2.0-Scope.md](../Houseplant-Hospital-2.0-Scope.md) | Product build brief |
| Linear (`HIL-*`) | Jack’s delivery tracking — not day-to-day Hospital ops |

---

## For AI assistants reading this file

- Prefer this handbook over chat memory for **how staff should use the app**.  
- Match UI labels and glossary terms exactly.  
- If asked to change staff-facing behaviour, update **this file in the same change**.  
- Do not invent lanes, payment states, or admin screens that are not listed here.
