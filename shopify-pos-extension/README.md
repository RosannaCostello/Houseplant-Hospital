# Shopify POS checkout extension

This folder contains a **Shopify POS UI extension** that loads pending Houseplant Hospital check-ins into the POS cart.

## Prerequisites

- Shopify CLI (`npm install -g @shopify/cli`)
- Houseplant Hospital deployed with migration `0014` applied
- `CRON_SECRET` used to authorize `GET /api/shopify/pos/pending`

## Setup

1. From repo root, run `shopify app init` if you do not yet have `shopify.app.toml` linked to the Hilda Dev Dashboard app.
2. Copy or merge `extensions/hh-pos-checkout` into your Shopify app project.
3. Set the app proxy / extension API base URL to your deployed Houseplant Hospital domain.
4. Register webhook `orders/paid` → `https://<your-domain>/api/webhooks/shopify/orders-paid`

## Staff workflow

1. In Safari (Houseplant Hospital), complete plants and tap **Go to checkout**.
2. Switch to **Shopify POS** → tap **Houseplant Hospital** tile.
3. Select the pending check-in → **Load to cart**.
4. Complete payment in POS as normal.
5. Return to Safari — payment status updates automatically.

## API

- `GET /api/shopify/pos/pending` — `Authorization: Bearer <CRON_SECRET>`
- `POST /api/shopify/pos/pending` — body `{ "type": "draft"|"visit", "id": "<uuid>" }` marks loaded

Line items include `hh_draft_id` / `hh_visit_id` properties for webhook reconciliation.
