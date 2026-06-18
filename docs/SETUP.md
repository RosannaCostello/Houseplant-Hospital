# Setup — Houseplant Hospital 2.0

This repo is the Houseplant Hospital internal ops app (Next.js + Supabase).

## Prereqs

- Node.js 20+
- A Supabase project for development (recommended name: `hh-dev`)

## Environment variables

1. Copy the template:

```bash
cp .env.example .env.local
```

2. Fill in `.env.local` with values from your Supabase project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

## Install + run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

- `/` — public landing
- `/login` — staff sign-in
- `/app` — protected dashboard (placeholder)
- `/settings` — admin-only stub

## Create the first admin user

Supabase Auth lives in the Supabase dashboard. For MVP, we create staff users manually.

1. In Supabase → **Authentication** → **Users**: create a user with email + password.
2. In SQL editor, insert a matching `profiles` row with role `admin`:

```sql
insert into public.profiles (user_id, role, name, email)
values ('<auth_user_uuid>', 'admin', 'Jack', 'jack@jackchalkley.com');
```

Repeat for staff users with role `staff`.

## Staff roster (Phase 1)

| Name | Email | Role |
|------|-------|------|
| Jack | jack@jackchalkley.com | admin |
| Rosanna | rosanna@hilda.co | admin |

To add Rosanna (or any admin):

1. Supabase → **Authentication** → **Users** → **Add user** → email `rosanna@hilda.co`, set a password (or send invite).
2. Copy the new user’s **UUID** from the users table.
3. SQL editor:

```sql
insert into public.profiles (user_id, role, name, email)
values ('<auth_user_uuid>', 'admin', 'Rosanna', 'rosanna@hilda.co')
on conflict (user_id) do update
  set role = excluded.role,
      name = excluded.name,
      email = excluded.email;
```

4. Rosanna signs in at `/login` (local or https://houseplanthospital.hildaedinburgh.workers.dev/login).

## Applying migrations

Migrations live in `supabase/migrations/`. Apply in order via Supabase SQL editor:

1. `0001_init.sql` — core schema
2. `0002_rls.sql` — RLS + roles
3. `0003_storage.sql` — `plant-photos` bucket
4. `0007_rls_hardening.sql` — staff-only operational access + block role escalation
5. `0008_storage_staff_only.sql` — plant photo access staff-only
6. `0009_shopify_pricing_hil52.sql` — Shopify variant mapping columns (HIL-52)
7. `0010_pricing_rules_dedupe.sql` — one active base_price row per size

Then run `supabase/seed.sql` for dev pricing rules.

To update pricing on an existing `hh-dev` database, run `supabase/migrations/0004_pricing_hil9.sql` in the SQL editor.

If **Bugs found** reports a missing surcharge rule, also run `supabase/migrations/0005_ensure_bugs_surcharge.sql`.

For **collection workflow** (final price + collected timestamp), run `supabase/migrations/0006_plant_collection_hil49.sql`.

For **Shopify pricing sync** (HIL-52), run `supabase/migrations/0009_shopify_pricing_hil52.sql`.

## Shopify pricing (HIL-52)

Shopify is the source of truth for **standard** and **pests** treatment prices. The app size **XS** maps to Shopify option **Mini** on both products.

### Env vars (server only)

```bash
SHOPIFY_STORE_DOMAIN=hildas-houseplants.myshopify.com
SHOPIFY_CLIENT_ID=...
SHOPIFY_CLIENT_SECRET=shpss_...   # Client secret from Dev Dashboard — not pasted as access token
CRON_SECRET=...                   # optional: for daily HTTP cron
```

Dev Dashboard apps use **client credentials** — the server exchanges Client ID + Secret for a short-lived `shpat_` token on each sync.

### Sync behaviour

- **Automatic:** when an admin opens `/settings`, sync runs if the last sync was over 24 hours ago
- **Manual:** **Sync from Shopify** button on Settings
- **Cron (optional):** `GET /api/cron/shopify-pricing` with header `Authorization: Bearer <CRON_SECRET>`

### Verification

1. Apply migration `0009`
2. Set env vars locally
3. Log in as admin → **Settings** → **Sync from Shopify**
4. Confirm standard + pests prices match Shopify for Mini/S–XL
5. Toggle **bugs found** on a plant — price should match the pests variant for that size (toggle is blocked until pests prices are synced)

## Mailchimp (HIL-8)

Mailchimp is the communications engine for hospital customers (contact sync, tags, journeys). The app remains the operational source of truth; Phase 5 wires the API.

### Account

| Setting | Value |
|---------|--------|
| Plan | **Essentials** |
| Audience | **Hilda** (existing main list — not a segment) |
| Audience ID | `c34fa4ecc8` |
| Server prefix (data centre) | `us17` |

Houseplant Hospital customers sync into the **Hilda** audience. Use **tags** (e.g. `houseplant_hospital`, `bugs_treatment`) to segment hospital contacts — not a separate audience.

The Hilda audience uses a required merge field **`NAME`** (full name), not default `FNAME`/`LNAME`. The client maps `firstName` + `lastName` → `NAME` automatically (`lib/mailchimp/merge-fields.ts`).

Essentials supports simple **API-triggered automation flows** (up to 4 steps per flow). Complex branching journeys need Standard.

### Env vars (server only)

Create an API key in Mailchimp → **Account & billing** → **Extras** → **API keys** (label e.g. `Houseplant Hospital`). Copy the full key once at creation.

```bash
MAILCHIMP_API_KEY=...          # full key ending in -us17
MAILCHIMP_SERVER_PREFIX=us17
MAILCHIMP_AUDIENCE_ID=c34fa4ecc8
```

Never commit API keys. For production (Phase 5), add the same three vars to Cloudflare Worker secrets.

### Verification (HIL-8)

- [x] Audience chosen: **Hilda**
- [x] Audience ID documented
- [x] API key created; env vars in `.env.local`

API integration and journeys are **Phase 5** (starts after HIL-8).

### Client library (HIL-53)

Server code lives under `lib/mailchimp/`:

- `env.ts` — `isMailchimpConfigured()`, `getMailchimpConfig()`
- `client.ts` — authenticated Marketing API requests
- `upsert-list-member.ts` — create/update audience member (preserves consent on update)
- `update-member-tags.ts` — add/remove tags
- `ping.ts` — connectivity check (`GET /ping`)
- `event-types.ts` — event names + payload types (`plant_checked_in`, status changes, etc.)
- `enqueue-event.ts` — insert `pending` rows into `mailchimp_events`
- `adapter.ts` — `getMailchimpAdapter()` queues via outbox (no live API from request path)

Set `MAILCHIMP_OUTBOX_ONLY=true` to queue events without calling Mailchimp (useful locally). When Mailchimp env vars are missing, outbox-only is automatic. The worker (HIL-57) processes pending rows when live delivery is enabled.

Quick local check (requires `.env.local`):

```bash
node --env-file=.env.local -e "
const key = process.env.MAILCHIMP_API_KEY;
const prefix = process.env.MAILCHIMP_SERVER_PREFIX;
fetch('https://' + prefix + '.api.mailchimp.com/3.0/ping', {
  headers: { Authorization: 'Basic ' + Buffer.from('anystring:' + key).toString('base64') },
}).then((r) => r.json()).then(console.log).catch(console.error);
"
```

Expected: `{ health_status: \"Everything's Chimpy!\" }` (or similar).

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Cloudflare Pages setup. **Confirm the correct GitHub repo with the agent before connecting deploy.**

## Linear workflow

This repo is tracked exclusively in Linear workspace `Houseplant-Hospital`, team `HIL-*`.

See [linear-workflow.md](./linear-workflow.md) and `.cursor/rules/linear.mdc`.

**Project progress:** [project-status.md](./project-status.md) — phases complete, live URL, what’s next.

## Phase 1 verification checklist

- [ ] Migrations applied to `hh-dev`
- [ ] `.env.local` configured
- [ ] Admin user + `profiles` row created
- [ ] `npm run dev` — login works, `/app` loads, staff blocked from `/settings`
- [ ] Cloudflare preview deploy (when repo remote is confirmed)

## Phase 2 verification checklist (HIL-39)

**Preview URL:** https://houseplanthospital.hildaedinburgh.workers.dev  
**Exit:** One visit with **3 plants**; kanban, photos, detail pages, search, and QR case page all work on **iPad + Mac**.

Hard-refresh or use a private window after each deploy if behaviour looks stale.

### A — iPad: 3-plant check-in

- [ ] Log in at `/login`
- [ ] **Check-in** → customer step: name, email, phone, consent → continue
- [ ] Plants step: add **3 plants** (mixed sizes; optional name/species/notes on at least one)
- [ ] Photos step: capture/upload a photo for **each** plant (camera opens on iPad)
- [ ] Complete check-in — no hang; lands on dashboard or success path
- [ ] All **3 cards** appear in **Check-in** lane with thumbnails

### B — MacBook: dashboard and navigation

- [ ] Log in; kanban shows the 3 new plants (hard refresh if needed)
- [ ] Card thumbnails load (not “No photo”)
- [ ] Click a card → `/app/plants/[id]` loads with photo and customer details
- [ ] **View visit** → `/app/visits/[id]` shows all 3 plants on the drop-off
- [ ] **Customers** → search finds the customer by surname or email
- [ ] Customer history → visits and plant links work
- [ ] **Open QR case page** → `/hh/case/[plantId]` opens on live host (not localhost)
- [ ] QR case page loads **without** login (test in private window)

### C — Regression

- [ ] Second check-in for same customer (email) upserts customer without error
- [ ] Log out and log back in; dashboard still loads plants

When all boxes are ticked, mark **HIL-39** Done in Linear — Phase 2 is complete.

## Phase 3 verification checklist (HIL-50)

**Verified:** June 2026 on live URL (iPad + Mac). **HIL-50** marked Done in Linear.

- [x] Kanban: move plant between lanes; card updates after refresh
- [x] `status_history` visible on plant detail
- [x] Treatment notes: add and persist
- [x] Care tips: add and persist
- [x] Bugs found toggle: saves, shows warning on card + detail, adjusts price estimate
- [x] Pricing summary on plant detail matches size band + bugs adjustment
- [x] Admin settings: edit XS–XL base prices
- [x] Collection: enter final price, mark collected; form hidden when collected
- [x] Full lifecycle: check-in → surgery → outpatient → collected (audit trail intact)
- [x] Post–HIL-51 smoke: collection £0 blocked, check-in photos survive refresh, kanban inline errors

## Deploy

```bash
cp .env.local .dev.vars && npm run deploy
```

See [DEPLOY.md](./DEPLOY.md) and [project-status.md](./project-status.md) for current release state.
