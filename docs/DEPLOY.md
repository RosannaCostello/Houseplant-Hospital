# Deploy — Cloudflare Pages (Phase 1)

Jack: confirm the correct GitHub repo/remote with the agent before pushing or connecting deploy.

## Prerequisites

- GitHub repo with this code pushed
- Supabase `hh-dev` (or preview) project with migrations applied
- Cloudflare account

## Cloudflare Pages setup

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select the Houseplant Hospital GitHub repository
3. Build settings:
   - **Framework preset:** Next.js
   - **Build command:** `npm run build`
   - **Build output:** `.next` (or use Cloudflare's detected Next.js settings)
   - **Node version:** 20+

4. Environment variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_BASE_URL` (preview URL or production domain when known)

5. Deploy and verify admin login at the preview URL.

## Notes

- Do not commit `.env.local` — use Cloudflare env vars per environment.
- Production Supabase (`hh-prod`) is Phase 6; use `hh-dev` for previews until go-live.
