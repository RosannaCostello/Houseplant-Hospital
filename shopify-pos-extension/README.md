# Shopify POS extension — setup guide

Load pending Houseplant Hospital check-ins into Shopify POS.

## Prerequisites

- [x] **Embed app in Shopify POS** ticked in Dev Dashboard
- [x] Houseplant Hospital deployed (`houseplanthospital.hildaedinburgh.workers.dev`)
- [x] `CRON_SECRET` on Cloudflare (same secret the extension uses to call `/api/shopify/pos/pending`)
- [x] Linked to **Houseplant Hospital pricing** (`shopify.app.toml`)
- Shopify POS on iPad, logged into **hildas-houseplants**

---

## 1. Install dependencies (once)

```bash
cd shopify-pos-extension
npm install
```

---

## 2. Configure API secret (once)

```bash
cp extensions/hh-pos-checkout/src/config.example.js extensions/hh-pos-checkout/src/config.js
```

Edit `extensions/hh-pos-checkout/src/config.js`:

- `API_BASE` — production URL (already set in example)
- `API_SECRET` — your **CRON_SECRET** (same as Cloudflare)

`config.js` is gitignored. It is bundled into the extension at deploy time.

---

## 3. Deploy to production

POS extensions are tested on the live POS app — there is no reliable iPad dev preview for this workflow.

```bash
cd shopify-pos-extension
npm run deploy
```

Confirm the release when prompted. After deploy:

1. Open **Shopify POS** on the iPad (may need to force-quit and reopen)
2. Home screen → **Add tile** / smart grid → add **Houseplant Hospital**

---

## 4. Test on live POS

1. Safari: start check-in → plants → **Go to checkout**
2. Shopify POS: tap **Houseplant Hospital** → pick customer → **Load to cart**
3. Complete payment
4. Safari: should show **Paid** → continue to photos

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| **"App failed to load"** when tapping tile | Redeploy with correct Preact deps (`npm run deploy`), force-quit POS, remove + re-add tile. If it persists: iPad **Settings → Apps → Shopify POS → Reset Account**, log back in. |
| Login screen when tapping tile; sign-in does nothing | You may have added the **app website** tile, not the extension. Remove it. In smart grid, add **Houseplant Hospital** with subheading **Load check-in cart**. |
| Tile not showing | Force-quit POS, reopen; check Dev Dashboard → app version is released |
| **"Load failed"** in modal | CORS — HH API must allow Shopify origins. Redeploy the **Workers app** (`npm run deploy` from repo root), then retry. |
| **Invalid prop… bulkCartUpdate** | Fixed — use sequential cart APIs. Redeploy extension (`npm run deploy` in `shopify-pos-extension/`). |
| `401` / "Could not load pending…" in modal | Wrong `API_SECRET` in `config.js` — must match Cloudflare `CRON_SECRET`; redeploy extension after fixing |
| No pending check-ins | Tap **Go to checkout** in HH app first (plants step) |
| Stale tile after deploy | Remove old tile from smart grid, add it again |

### “Login screen” on tile tap

The HH web app (`houseplanthospital…`) uses **staff email/password** login. That does not work inside the POS webview — sign-in appears to do nothing.

The POS **extension** tile (subheading: **Load check-in cart**) opens a native modal and calls the HH API directly. It must not open the HH website.

After changing `shopify.app.toml`, redeploy:

```bash
cd shopify-pos-extension
npm run deploy
```

Then in **Dev Dashboard** → your app → **Install app** on **hildas-houseplants** (if not already). Force-quit POS and re-add the tile.

---

## API (reference)

- `GET /api/shopify/pos/pending` — `Authorization: Bearer <CRON_SECRET>`
- `POST /api/shopify/pos/pending` — `{ "type": "draft", "id": "<uuid>" }`

Line items include a hidden `_hh_draft_id` or `_hh_visit_id` for the payment webhook.
