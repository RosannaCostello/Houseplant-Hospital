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

## Applying migrations

Migrations live in `supabase/migrations/`. Apply in order via Supabase SQL editor:

1. `0001_init.sql` — core schema
2. `0002_rls.sql` — RLS + roles
3. `0003_storage.sql` — `plant-photos` bucket

Then run `supabase/seed.sql` for dev pricing rules (update amounts after HIL-9).

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
