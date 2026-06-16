# Agent handoff — Houseplant Hospital 2.0

Last updated: 2026-06-16  
Repo: `RosannaCostello/Houseplant-Hospital`  
Linear workspace: `Houseplant-Hospital` (`HIL-*` only)  
Contributor: jack@jackchalkley.com

---

## What this project is

Internal ops app for Hilda's Houseplant Hospital (replaces Zoho). Scope doc: `Houseplant-Hospital-2.0-Scope.md`.

**Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, shadcn (neutral), Supabase (Postgres/Auth/Storage/RLS), Cloudflare Workers via OpenNext.

**Phase 1 goal:** Admin can log in on a preview URL; DB schema + RLS in place; protected app shell only. **Do not start Phase 2** until Jack says so.

---

## What was built (Phase 1 — code complete locally)

### App scaffold
- Next.js App Router with routes: `/`, `/login`, `/app`, `/settings`, `/auth/signout`
- Auth middleware protecting `/app` and `/settings` (admin-only for settings)
- Supabase clients: `lib/supabase/browser.ts`, `server.ts`, `admin.ts`
- Env validation: `lib/env.ts` (Zod; empty strings treated as undefined)
- shadcn/ui: `components/ui/button.tsx`, `lib/utils.ts`, `components.json`
- Docs: `docs/SETUP.md`, `docs/DEPLOY.md`, `.env.example`, `README.md`

### Supabase (`hh-dev`, London)
Migrations applied via SQL editor:
1. `supabase/migrations/0001_init.sql` — full schema
2. `supabase/migrations/0002_rls.sql` — RLS + admin/staff roles
3. `supabase/migrations/0003_storage.sql` — `plant-photos` bucket + policies
4. `supabase/seed.sql` — placeholder XS–XL pricing + 10% bugs surcharge

**Note:** `0001` was run with **Run without RLS**; `0002` adds RLS.

### Git commits on `main`
| Commit | Message |
|--------|---------|
| `f5279d1` | HIL-16: Phase 1 foundation — Next.js, Supabase schema, auth shell |
| `9e48f6f` | HIL-20: sync package-lock for Cloudflare npm 10 ci |
| `ef09f8d` | HIL-20: add OpenNext Cloudflare adapter with matching worker name |

---

## What Jack completed manually

- Supabase `hh-dev` project created and migrations + seed applied
- Admin user in Supabase Auth + `profiles` row with `role = admin`
- `.env.local` configured (anon key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`, not service_role)
- Local login verified: `/login` → `/app`, admin `/settings` works
- Cloudflare account created; GitHub repo connected for Workers deploy
- Supabase env vars added in Cloudflare dashboard (Production + Preview)

---

## Bugs fixed during sessions

1. **"Forbidden use of secret API key in browser"** — service_role key was in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Fixed in `.env.local`.
2. **ZodError on empty optional env vars** — fixed `lib/env.ts` with `emptyToUndefined()`.
3. **Cloudflare `npm ci` lockfile mismatch** — local npm 11 vs Cloudflare npm 10. Regenerated lockfile with `npx npm@10.9.2 install`.
4. **Worker name mismatch** — Cloudflare project name `Houseplant-Hospital` → worker `houseplanthospital` (no hyphens). OpenNext migrate used `houseplant-hospital`. Fixed in `wrangler.jsonc`.
5. **"Could not find compiled Open Next config"** — Cloudflare build ran `next build` but deploy needs `opennextjs-cloudflare build`. Fix prepared locally (see below); **not yet pushed**.

---

## Cloudflare deploy — reassessment

**What we thought:** Connect GitHub, add env vars, deploy.  
**What it actually is:** Next.js on Cloudflare Workers requires the **OpenNext adapter** (`@opennextjs/cloudflare`). This is not a simple Pages static deploy.

### Required repo files (committed in `ef09f8d`)
- `wrangler.jsonc` — worker name `houseplanthospital`, OpenNext output paths, `WORKER_SELF_REFERENCE` binding
- `open-next.config.ts`
- `public/_headers` — static asset caching
- `package.json` — OpenNext + wrangler deps; `preview` / `deploy` scripts
- `next.config.ts` — `initOpenNextCloudflareForDev()` for local dev
- `.gitignore` — `.open-next`, `.dev.vars`

### Cloudflare dashboard settings
| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Worker name | `houseplanthospital` (must match `wrangler.jsonc`) |

### Env vars (Cloudflare → Settings → Variables)
| Name | Notes |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon** key only |
| `SUPABASE_SERVICE_ROLE_KEY` | Encrypt |
| `APP_BASE_URL` | Preview URL after first successful deploy |

### Deploy errors encountered (in order)
1. `npm ci` — lockfile out of sync → fixed with npm 10 lockfile commit
2. `WORKER_SELF_REFERENCE` references wrong worker name → fixed in `wrangler.jsonc`
3. `Could not find compiled Open Next config` → build command was `next build` instead of OpenNext build

### Pending fix (local, uncommitted)
`package.json` changed so `npm run build` runs `opennextjs-cloudflare build` (includes `next build` internally). Added `build:next` for plain Next build if needed. `docs/DEPLOY.md` updated with fast-path local deploy instructions.

**To finish HIL-20:**
```bash
git add package.json docs/DEPLOY.md
git commit -m "HIL-20: use OpenNext build for Cloudflare CI"
git push
```
Then retry deploy in Cloudflare (or use fast path below).

### Fast path — deploy from Mac (bypass CI)
```bash
npx wrangler login
cp .env.local .dev.vars
npm run deploy
```
Production env vars must still be set in Cloudflare dashboard.

---

## Linear status (Phase 1)

**Done (or effectively done):** HIL-5, HIL-6, HIL-14, HIL-16, HIL-18, HIL-25, HIL-17, HIL-22, HIL-24, HIL-19, HIL-13, HIL-23, HIL-21, HIL-15

**In progress / blocked:**
- **HIL-7** — Cloudflare account (created)
- **HIL-20** — Cloudflare deploy + preview URL (blocked on build command fix above)

**Optional / open:**
- **HIL-9** — Real pricing export (seed has placeholders)
- **HIL-11** — Staff emails list

**Not started:** Phase 2+ (kanban, check-in, photos, etc.) — see `docs/linear-backlog.md`

---

## Key paths

| Path | Purpose |
|------|---------|
| `lib/env.ts` | Env validation |
| `middleware.ts` | Auth redirects |
| `wrangler.jsonc` | Cloudflare Worker config |
| `open-next.config.ts` | OpenNext adapter config |
| `.env.local` | Local secrets (gitignored) |
| `.dev.vars` | Local wrangler/OpenNext secrets (gitignored) |
| `docs/SETUP.md` | Local setup |
| `docs/DEPLOY.md` | Cloudflare deploy |

---

## Conventions for future agents

- Only `HIL-*` issues in `Houseplant-Hospital` Linear workspace
- Hilda requirements in scope doc always win
- Do not touch GitHub remote without confirming with Jack
- Do not commit unless Jack asks
- Regenerate lockfile with `npx npm@10.9.2 install` (Cloudflare uses npm 10)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be the **anon** key, never service_role

---

## Immediate next step

1. Commit + push the pending `package.json` / `docs/DEPLOY.md` fix
2. Retry Cloudflare deploy
3. Set `APP_BASE_URL` to the live workers.dev URL
4. Test `/login` on preview
5. Mark HIL-20 Done in Linear
