# Houseplant Hospital — Operator Handbook

**Audience:** Rosanna, shop staff, and any AI given this file  
**Live app:** https://houseplanthospital.hildaedinburgh.workers.dev  
**Last updated:** 4 August 2026

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
| **Brother labels** | Label printing (hardware / print-bridge — not required for core board use) |

**Zoho Creator** is replaced for day-to-day Hospital ops. Historic Zoho plants may appear in Analytics as collected history.

---

## Roles

| Role | Can use |
|---|---|
| **Staff** (signed in) | Check-in, Dashboard (kanban), plant / visit detail, pests, notes, tips, propagate, collect / payment actions |
| **Admin** | Everything staff can, plus **Analytics** (bottom nav) and **Settings** (Account menu, top right) |

Non-admins who open `/app/analytics` or `/settings` are sent back to the Dashboard.

Bottom nav (typical): **Check-in** · **Dashboard** · **Analytics** (admin). **Settings** and **Log out** are under the **Account** pill (top right). Customers is available via links but not in the bottom nav.

---

## Glossary (canonical terms)

Use these words when talking about the app.

| Term | Meaning |
|---|---|
| **Customer** | Person bringing plants in (name, email, phone). |
| **Visit** | One check-in occasion for a customer (may include several plants). |
| **Plant** | One plant on a visit. The board is organised by **plants**, not visits. |
| **Check-in** (flow) | Creating a new visit: customer → plants → photos. |
| **Incomplete check-in** | A draft visit not finished yet (still on plants or photos step). Shown in the Incomplete lane. |
| **Dashboard** | Kanban board of active plants by lane. Use the search box to filter by customer **name** or **email**. On iPad, **tap the photo or customer name** to **Update plant**; use the **⋯** menu for lane moves (drag between lanes also works, but tap is the reliable path). |
| **Update plant** | Opens the plant record as an **overlay** on the current page (not a separate screen). Check-in stays full screen so you can hand the iPad to the customer. Treatment notes autosave on pause and when you tap **Close** — wait for “Saving…” if you just typed. |
| **Lane / status** | Where a plant sits on the board (see [Lanes](#lanes)). |
| **Pests / Bugs found** | Whether pests were found. At **check-in**: **Any pests visible on this plant?** On **Update plant**: **Pests found during treatment?** (Yes / No / Clear answer). Affects price, starting lane, and Outpatient readiness. |
| **Pest treatments** | Three slots on plant detail (Treatment 1 / 2 / 3). Each picks a treatment type from Settings, then **Record** locks it with date/time. Required before Outpatient if pests were **ever** found. |
| **Treatment notes** | Notes on the plant (required before Outpatient). Max **750 characters** so the full note can reach customer emails via Mailchimp (see below). |
| **Care tips** | Aftercare advice for the customer, chosen as **Water / Leaves / Light** dropdowns on plant detail (required before Outpatient). Saved as one composed string. |
| **Final price** | Price locked on the plant at collection. Used for **treatment revenue**. |
| **Treatment revenue** | Sum of final prices on plants collected in a period. **Revenue, not profit.** |
| **Propagation** | Creating a child plant from a healthy (pests-free) plant in Surgery. Also a **lane** and a plant **category**. |
| **Standard plant** | Normal Hospital plant (not a propagation child). |
| **Pay at collection** | Customer pays when collecting, not at check-in. |
| **POS / Shopify POS** | Shop till extension used to take Hospital payment. |
| **Outpatient** | Plant is ready for collection. |
| **Outpatient ready** | This plant has pests answered (if standard), treatment notes, all three care tip dropdowns (Water, Leaves, Light), and — if pests were ever found — all three pest treatments — so it can move to Outpatient. |
| **Outpatient partial** | On a multi-plant visit, one plant is in Outpatient but siblings are not yet ready. Staff still move plants one by one; the app emails Mailchimp a “partial” event until the last sibling is ready (then a full ready-to-collect event). Staff do not manage this as a separate screen. |
| **Collected** | Plant has gone home. Terminal status — **view only** (notes, tips, pests, treatments, photo retake, and actions locked). |
| **Dead** | Plant did not survive treatment. Terminal status. |
| **Total customers** (Analytics) | Distinct customers with a visit check-in in the selected period. |
| **New / Returning customers** | First-ever visit in this period vs had an earlier visit before this period. |

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

### Check in a customer (new visit)

**iPad tip:** Hand the iPad to the customer for this flow. Primary buttons are large; **Continue** sits above **Discard**. Staff chrome (Dashboard / Account) is de-emphasised so customers are less likely to leave mid-flow. Test with the software keyboard open — fields and Continue should stay usable.

1. Bottom nav → **Check-in**.  
2. Enter **customer** details → continue (creates an incomplete draft). **Marketing emails** starts **unchecked** (customer opts in).  
3. **Plants** step: add each plant (name optional, **species** optional with typeahead from species used before, **size**, **Any pests visible on this plant?**).  
4. If Shopify pricing is on: choose **Go to checkout** (queue for POS) or **Pay at collection**. After **POS paid** or **Pay at collection**, the app returns you to the **Dashboard**. Finish photos later from the **Incomplete check-ins** lane if needed.  
5. **Photos** step (when you continue or resume): one photo per plant → **Complete check-in**.  
6. Plants appear on the **Dashboard**. Plants marked **pests Yes** land in **Quarantine** (not Check-in).

You can leave mid-flow and resume from the **Incomplete check-ins** lane (**Complete check-in**) or discard the draft (**Discard** — irreversible).

### Update plant (esp. Surgery / dirty hands)

1. On the Dashboard, tap the plant **photo** or **customer name** (or **Update plant** from **⋯**).  
2. Edit pests, notes, care tips, treatments as needed. Notes save automatically; **Close** waits for a pending save.  
3. Use **⋯** (or drag) to move lanes — not the photo tap.

### Species at check-in

- Optional free text.  
- After typing about **2 characters**, suggestions appear from species already recorded on past plants.  
- Tap a suggestion to fill the field, or keep typing a new species — new values are always allowed.

### Find a plant on the Dashboard

1. Use the **Search by name or email** box above the lanes.  
2. As you type, plant cards and incomplete drafts that do not match are hidden.  
3. Each lane has a **Newest / Oldest** toggle. Most lanes sort by check-in date. The **Collected** lane sorts by **collection date** (newest = collected most recently).

### Move a plant on the board

1. On the Dashboard, open the plant’s **⋯** menu (or drag the card onto another lane).  
2. Choose an **allowed** next lane.  
3. Confirm any prompts (e.g. Outpatient readiness, collection payment).  
4. Moving to **In Surgery** opens **Update plant** so you can start notes immediately.

### Before Outpatient (standard plants)

The app blocks Outpatient until the plant is **Outpatient ready**:

- **Pests** answered (Yes or No)  
- **Treatment notes** filled (max 750 characters — counter on plant detail)  
- **Care tips** — choose all three: Water, Leaves, and Light  
- If pests were **ever** found on this plant: all three **pest treatments** recorded (type + date/time; locked once recorded)

Propagation plants skip the pests requirement for this gate. Plants that never had pests do not need pest treatments.

On multi-plant visits, move each plant when it is ready. Sibling plants still in earlier lanes mean **Outpatient partial** for email purposes — no extra staff step.

### Quarantine pest treatments

On plant detail (when the plant is in **Quarantine** or has ever had pests):

1. For **Treatment 1**, **2**, and **3**: choose a treatment type from the dropdown — confirm in the dialog to lock it with date and time. Cancel returns the dropdown to “Select treatment…”.  
2. Recorded treatments **cannot be undone** (no clear / change).  
3. Treatment types are managed by admins in **Settings → Pest treatment options**.  
4. On **Collected** plants the section is view-only.

### Plant photos on plant detail

1. Tap the main photo (or a thumbnail) to open a **fullscreen** view — close with the button, backdrop, or Escape.  
2. Use **Retake photo** to replace the latest photo (camera or library).  
3. **Collected** plants: fullscreen view is allowed; retake is disabled.

### Mailchimp — events, properties, merge fields, and tags

The app does **not** send finished emails. It upserts the contact, applies tags, and queues **events**. Journeys and email copy live in **Mailchimp**.

Mailchimp only allows **255 characters per event property**, and HTML emails collapse line breaks inside a single property to spaces.

#### Journey trigger event names

Use these exact names when wiring journeys:

| Event name | When the app fires it |
|---|---|
| `plant_checked_in` | Check-in completes (one event per plant) |
| `plant_quarantined` | Plant moves to Quarantine (including pests Yes at check-in) |
| `plant_in_surgery` | Plant moves to In Surgery |
| `plant_outpatient` | Plant moves to Outpatient **and** the visit is fully ready to collect |
| `plant_outpatient_partial` | Plant moves to Outpatient but sibling plants still block the ready-to-collect notice |
| `plant_collected` | Plant moves to Collected |
| `plant_dead` | Plant moves to Dead |
| `bugs_found` | Pests set to Yes on plant detail (after check-in) |

#### Event properties (variables on the event)

Properties are only included when the app has a value. Empty / unused properties are omitted.

| Property | Meaning |
|---|---|
| `visit_id` | Visit UUID |
| `plant_id` | Plant UUID |
| `customer_id` | Customer UUID |
| `plant_name` | Plant display name (if set) |
| `previous_status` | Status before the change (status / bugs events) |
| `new_status` | Status after the change (status events) |
| `bugs_found` | `"true"` / `"false"` when sent with the `bugs_found` event |
| `awaiting_plant_count` | How many sibling plants still block collection (`plant_outpatient_partial` only) |
| `treatment_notes_1` | Treatment note chars 1–250 |
| `treatment_notes_2` | Treatment note chars 251–500 |
| `treatment_notes_3` | Treatment note chars 501–750 |
| `care_tips_water` | Water tip option text only (no `Water:` prefix) |
| `care_tips_leaves` | Leaves tip option text only |
| `care_tips_light` | Light tip option text only |

**What typically carries notes / tips:** status-change events and `bugs_found` load the latest treatment notes and care tips for that plant. `plant_checked_in` usually only has ids + optional `plant_name` (notes/tips are rarely filled yet).

**Treatment notes (750 char staff cap):**

1. Caps treatment notes at **750 characters** in the UI (with a live counter).  
2. Splits into `treatment_notes_1` / `_2` / `_3` as above.  
3. In email builders: include **all three** one after another. Unused chunks are blank / omitted.

**Care tips:**

1. Sent as three separate properties (option text only).  
2. In email builders: include **all three** (`care_tips_water`, `care_tips_leaves`, `care_tips_light`) **each on its own line**. Do not use the old single `care_tips` tag.

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
| `repeat_hospital_customer` | Customer already has more than one visit |
| `newsletter` | Marketing consent checked at check-in |
| `bugs_treatment` | `bugs_found` event (pests Yes on plant detail) |

#### Quarantine email delay (Mailchimp journey)

When pests are **Yes** at check-in, the plant goes straight into **Quarantine**, so the app fires both the check-in event and `plant_quarantined` at the same time. The Mailchimp **quarantine** journey intentionally **delays** that email so the customer is not hit with two messages at once. Quarantine is not time-sensitive for the customer, so the delay is expected — do not treat a late quarantine email as a bug, and do not remove the delay without a product decision.

### Pests (bugs found)

- Set at check-in (Yes / No). **Yes** places the plant in **Quarantine** when check-in completes (which also queues a quarantine Mailchimp event — see **Quarantine email delay** above).  
- Can be changed on plant detail until **Collected** (Clear answer exists in UI). Clearing Yes does **not** remove the “ever had pests” flag used for treatments / Outpatient.  
- **Propagation plants** do not show the pests control (always no pests).  
- Yes → pests treatment pricing when Shopify/rules apply.

### Propagate

1. Plant must be **standard**, in **In Surgery**, **pests = No**, and not already propagated.  
2. Use **Propagate** → pick child **size** → confirm.  
3. A **new visit** with one child plant appears in **Propagation**.  
4. Source plant can only propagate **once**.

### Collect / payment

- **Outpatient → Collected** may prompt for payment if the visit is still unpaid.
  1. Find the order in **Shopify POS** under the customer name and take payment, **or**
  2. Confirm **Customer paid another way** (second confirm — cannot be undone). That marks the **visit** as settled for Hospital ops.
- Collecting a plant stamps **final price** from the treatment estimate when none was stored yet (no separate collection form).
- Payment is **visit-level**: collecting one plant on a multi-plant visit does not require siblings to be collected first.
- **Collected** is final for that plant — staff can still open the record to view details, but cannot edit notes, care tips, pests, or status.
- Pricing on plant detail shows the treatment estimate / recorded final price.
- On **Outpatient** / **Collected** plant detail, **Time in Surgery** shows how long that plant spent in In Surgery (from status history).

### Find a customer or plant

- Open the plant from the Dashboard card.  
- Customer pages exist via links from plant/visit detail (Customers is not in the bottom nav).

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
| **Plants checked in** | Plants on visits checked in during the period. |
| **Plants collected** | Plants whose collection completed in the period. |

Info (**i**) icons explain each metric and chart. Charts compare current vs previous period (fainter lines = previous).

Also on Analytics: customers / pests / propagations summaries, live **Current operations** (lanes, incomplete check-ins, payments, oldest active plants). Current operations is a **live snapshot** — not filtered by the date range.

### Settings (`/settings`)

- View / manage size-band pricing.  
- **Sync from Shopify** refreshes standard, pests, and propagation prices from Shopify products.  
- **Care tips options** — add, edit, or delete Water / Leaves / Light choices used on plant detail.  
- **Treatment notes placeholder** — edit the hint text shown in the treatment notes box.

On plant detail, care tips save automatically once all three dropdowns are chosen, as:

```
Water: …
Leaves: …
Light: …
```

Older free-text care tips that do not match this format show as a read-only note until staff re-select all three and save.

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
Yes for most Performance metrics (as collected history; synthetic collection date = check-in + 14 days). They are hidden from the day-to-day ops board. **Avg time in Surgery** is an exception: it uses status history from **app** visits only and excludes Zoho imports.

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
