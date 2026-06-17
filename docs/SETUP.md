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

Then run `supabase/seed.sql` for dev pricing rules.

To update pricing on an existing `hh-dev` database, run `supabase/migrations/0004_pricing_hil9.sql` in the SQL editor.

If **Bugs found** reports a missing surcharge rule, also run `supabase/migrations/0005_ensure_bugs_surcharge.sql`.

For **collection workflow** (final price + collected timestamp), run `supabase/migrations/0006_plant_collection_hil49.sql`.

## Deploy

See [DEPLOY.md](./DEPLOY.md) for Cloudflare Pages setup. **Confirm the correct GitHub repo with the agent before connecting deploy.**

## Linear workflow

This repo is tracked exclusively in Linear workspace `Houseplant-Hospital`, team `HIL-*`.

See [linear-workflow.md](./linear-workflow.md) and `.cursor/rules/linear.mdc`.

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
