# Deploy — Cloudflare Workers (Phase 1)

Jack: confirm the correct GitHub repo/remote with the agent before pushing or connecting deploy.

## Prerequisites

- GitHub repo with this code pushed
- Supabase `hh-dev` (or preview) project with migrations applied
- Cloudflare account

## Cloudflare Workers setup (OpenNext)

This app uses [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) to run Next.js on Cloudflare Workers.

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → connect the GitHub repo
2. Build settings (auto-detected for Next.js):
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx wrangler deploy`
   - Do **not** set `npm run build` as the Cloudflare build command — OpenNext calls that internally for `next build`, and pointing it back at OpenNext causes an infinite loop.
3. **Worker name** must match `wrangler.jsonc` → currently `houseplanthospital` (Cloudflare strips hyphens from project names).
4. Environment variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (encrypt)
   - `APP_BASE_URL` (preview URL after first deploy)
   - `CRON_SECRET` (encrypt) — auth for `/api/cron/*` **and** the `scheduled()` handler in `custom-worker.ts`
   - `MAILCHIMP_*` (Phase 5)

5. Deploy and verify admin login at the preview URL.

Cron triggers are defined in `wrangler.jsonc` (`*/5 * * * *` mailchimp outbox, `0 6 * * *` Shopify pricing). Entry point is `custom-worker.ts` (wraps OpenNext worker + `scheduled` handler).

## Fast path — deploy from your Mac (skip CI debugging)

If Cloudflare CI keeps failing, you can deploy once from your machine to get a preview URL:

```bash
npx wrangler login
cp .env.local .dev.vars
npm run deploy
```

Env vars for production must still be set in the Cloudflare dashboard (**Workers & Pages → houseplanthospital → Settings → Variables**).

**Cron requires a Worker secret.** `deploy:live` bakes most env into the Next bundle, but `custom-worker.ts` `scheduled()` only sees Cloudflare bindings — not build-time env. After first deploy, run once:

```bash
grep '^CRON_SECRET=' .env.local | cut -d= -f2- | xargs | npx wrangler secret put CRON_SECRET
```

Verify: `npx wrangler tail houseplanthospital` — at each `:00/:05/...` you should see `[cron] /api/cron/mailchimp-outbox ok: ...`, not `CRON_SECRET not set`.

## Post-deploy cron verification

If Mailchimp journeys stop firing or Shopify prices go stale, cron is the first thing to check:

1. **Worker secret:** `npx wrangler secret list` should include `CRON_SECRET`. If missing, Mailchimp outbox and Shopify sync never run (`[cron] CRON_SECRET not set` in tail logs).
2. **HTTP cron routes:** `GET /api/cron/mailchimp-outbox` and `GET /api/cron/shopify-pricing` require `Authorization: Bearer <CRON_SECRET>`.
3. **Schedule:** `wrangler.jsonc` — Mailchimp every 5 minutes, Shopify daily at 06:00 UTC.
4. **Manual test:**

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "https://houseplanthospital.hildaedinburgh.workers.dev/api/cron/mailchimp-outbox"
```

Expect JSON with `success: true` and `sent` / `processed` counts (or `skipped` when `MAILCHIMP_OUTBOX_ONLY` is set).

## Local preview

```bash
cp .env.local .dev.vars   # OpenNext reads .dev.vars for local wrangler preview
npm run preview
```

## Lockfile note

Cloudflare CI uses **npm 10**. Regenerate `package-lock.json` with:

```bash
npx npm@10.9.2 install
```

## Notes

- Do not commit `.env.local` or `.dev.vars` — use Cloudflare env vars per environment.
- Apply Supabase migrations **0011** and **0012** before deploying builds that use nullable bugs-found or autosave notes (see [SETUP.md](./SETUP.md)).
- Production Supabase (`hh-prod`) is Phase 6; use `hh-dev` for previews until go-live.
