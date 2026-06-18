# Project status — Houseplant Hospital 2.0

Living summary of what’s shipped and what’s next. Update this at the end of significant sessions.

**Last updated:** 18 June 2026  
**Live:** https://houseplanthospital.hildaedinburgh.workers.dev  
**Supabase:** `hh-dev` (migrations through `0010`)  
**Latest deploy:** *(pending — HIL-52 Shopify pricing sync)*

Related docs: [SETUP.md](./SETUP.md) · [linear-backlog.md](./linear-backlog.md) · [code-review.md](./code-review.md) · [Scope](../Houseplant-Hospital-2.0-Scope.md)

---

## At a glance

| Phase | Status | Linear milestone |
|-------|--------|------------------|
| 1 — Foundation | **Complete** | Auth, schema, RLS, Cloudflare deploy |
| 2 — Core operations | **Complete** | HIL-39 verified (iPad + Mac) |
| 3 — Workflow and pricing | **Complete** | HIL-50 verified (iPad + Mac) |
| **Shopify pricing (HIL-52)** | **Complete** (local verified) | Sync standard + pests from Shopify |
| 4 — Label printing | **Not started** | Needs printer + Mac Mini at store (S8) |
| 5 — Mailchimp | **Not started** | Independent of Phase 4; needs S4 |
| 6 — Polish and go-live | **Not started** | — |

**Tech debt (HIL-51):** Critical + priority + second-batch items **done**. Nice-to-haves remain in [code-review.md](./code-review.md).

---

## What’s live today

Staff can:

- Log in and use the kanban dashboard (6 lanes)
- Run full **check-in** (customer → plants → photos) on iPad
- View plant / visit / customer detail pages and search customers
- Move plants between lanes; changes write to `status_history`
- Add treatment notes and care tips
- Toggle **bugs found** (pests price from Shopify when configured; no % fallback)
- **Shopify pricing sync** in Settings (standard + pests products; Mini → XS)
- See **pricing summary** on plant detail (with fallback if config fails)
- **Collect** plants with final price (> £0 guard)
- Open public **QR case page** at `/hh/case/[plantId]` (no login)
- Manage size-band pricing in **Settings** (admin only)

---

## Phase 3 deliverables (HIL-40–50)

| Area | Notes |
|------|--------|
| Status moves | Kanban select + server action; inline errors; select resets on failure |
| `status_history` | Every status change + initial row at check-in |
| Treatment notes / care tips | Plant detail sections |
| Bugs toggle | `pricing_adjustments` + dashboard warning |
| Pricing engine | `pricing_rules` + `lib/pricing/`; admin settings UI |
| Collection | `final_price`, `collected_at`; form hidden when collected |
| HIL-51 hardening | RLS `0007`/`0008`, safe login redirect, check-in server path, draft validation, customer email guard, UUID 404s, storage rollback on failed check-in |

---

## Migrations applied (`hh-dev`)

| Migration | Purpose |
|-----------|---------|
| `0001`–`0003` | Core schema, RLS, storage |
| `0004` | Pricing rules seed |
| `0005` | Ensure bugs surcharge row |
| `0006` | `plants.final_price`, `plants.collected_at` |
| `0007` | Staff-only RLS, block role escalation |
| `0008` | Storage staff-only |
| `0009` | Shopify variant columns + pests_amount |
| `0010` | Dedupe active base_price rows per size |

---

## Jack setup tasks still open

| ID | Task | Blocks |
|----|------|--------|
| **S4** | Mailchimp plan + audience ID | Phase 5 |
| **S6** | Brand assets (logo, label refs) | Phase 4 template, Phase 6 |
| **S8** | Mac Mini + Brother printer on shop WiFi | Phase 4 |

---

## Next session

1. **Phase 4** — label printing (at Hilda store with printer)
2. **Phase 5** — Mailchimp integration (can start from home once S4 is done; not blocked on Phase 4)

Start with: Phase 4.1 (`APP_BASE_URL`) + S8 hardware check, or Phase 5.1 + S4 if working remotely.

---

## Recent commits (newest first)

```
eaaba14 HIL-51: harden check-in, collection, kanban, and detail routes
842d665 HIL-51: critical security + workflow hardening
d855f26 Fix collection price not updating when bugs toggle changes estimate
16ac635 Fix plant detail crash when collection migration is not applied
384ec24 HIL-45–49: Phase 3 pricing engine, summary, admin settings, and collection
```
