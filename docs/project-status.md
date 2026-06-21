# Project status — Houseplant Hospital 2.0

Living summary of what’s shipped and what’s next. Update this at the end of significant sessions.

**Last updated:** 20 June 2026  
**Live:** https://houseplanthospital.hildaedinburgh.workers.dev  
**Supabase:** `hh-dev` (migrations through **0012** — apply manually)  
**Pending release:** local uncommitted UX work + fixes below (not yet deployed)

Related docs: [SETUP.md](./SETUP.md) · [linear-backlog.md](./linear-backlog.md) · [brand-tokens.md](./brand-tokens.md) · [code-review.md](./code-review.md) · [Scope](../Houseplant-Hospital-2.0-Scope.md)

---

## At a glance

| Phase | Status | Linear milestone |
|-------|--------|------------------|
| 1 — Foundation | **Complete** | Auth, schema, RLS, Cloudflare deploy |
| 2 — Core operations | **Complete** | HIL-39 verified (iPad + Mac) |
| 3 — Workflow and pricing | **Complete** | HIL-50 verified (iPad + Mac) |
| **Shopify pricing (HIL-52)** | **Complete** (live) | Sync standard + pests from Shopify |
| 4 — Label printing | **Not started** | Needs [HIL-12](https://linear.app/hilda-houseplant-hospital/issue/HIL-12) (printer at store) |
| 5 — Mailchimp | **Complete** — HIL-53–60 done | HIL-59 optional |
| 6 — Polish and go-live | **In progress** — [HIL-61](https://linear.app/hilda-houseplant-hospital/issue/HIL-61), [HIL-63](https://linear.app/hilda-houseplant-hospital/issue/HIL-63) in progress | HIL-62–68 |

**Tech debt (HIL-51):** Critical + priority + second-batch items **done**. Nice-to-haves remain in [code-review.md](./code-review.md).

---

## What’s live today (deployed ~HIL-57)

Staff can:

- Log in and use the kanban dashboard (6 lanes)
- Run full **check-in** (customer → plants → photos) on iPad
- View plant / visit / customer detail pages and search customers
- Move plants between lanes; changes write to `status_history`
- Toggle **bugs found** (pests price from Shopify when configured)
- **Shopify pricing sync** in Settings (standard + pests products; Mini → XS)
- See **pricing summary** on plant detail
- Open public **QR case page** at `/hh/case/[plantId]` (no login)
- Manage size-band pricing in **Settings** (admin only)

---

## Pending release (local — not deployed yet)

Includes check-in UX refinements, plant detail redesign, nullable bugs-found, autosave notes/tips, partial Hilda brand styling, and code-review fixes:

| Fix | Area |
|-----|------|
| Check-in rollback on partial plant failure | `create-check-in-records.ts` |
| Autosave notes survive page refresh while typing | `plant-autosave-textarea.tsx` |
| Notes/tips upsert on `plant_id` (needs **0012**) | `save-treatment-note.ts`, `save-care-tip.ts` |
| Mailchimp outbox row claiming (`processing` status) | `process-outbox.ts` |
| Photos step: tab-close warning + draft notice | `photos-step-form.tsx` |
| Marketing consent: clearer pre-selected copy | `customer-step-form.tsx` |

**Migrations required before deploy:** `0011_bugs_found_nullable.sql`, `0012_single_plant_notes.sql`

---

## Collection / pricing (product direction — not in this release)

Price at collection will be the **calculated treatment total** (size band + bugs adjustment when answered) **locked when status becomes Collected**. A separate editable “final price” field is not the long-term model.

Future refinement: pre-move prompts on kanban (e.g. confirm price before Collected). Not implemented yet.

---

## Migrations (`hh-dev`)

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
| **`0011`** | Nullable `bugs_found` (unset / yes / no) |
| **`0012`** | One treatment note + one care tip per plant |

---

## Jack setup tasks still open

| ID | Task | Blocks |
|----|------|--------|
| **HIL-10** | Brand assets (logo, label refs) | Phase 4 template, Phase 6 |
| **HIL-12** | Mac Mini + Brother printer on shop WiFi | Phase 4 |

---

## Next session

1. **Deploy pending release** — commit, apply 0011/0012 on target Supabase, deploy to Cloudflare, verify cron secret
2. **Phase 6** — [HIL-63](https://linear.app/hilda-houseplant-hospital/issue/HIL-63) complete brand tokens on check-in + plant detail
3. **Phase 4** — label printing (needs [HIL-12](https://linear.app/hilda-houseplant-hospital/issue/HIL-12))

---

## Deploy checklist (before each production/preview push)

1. Apply any new SQL in `supabase/migrations/` on the target Supabase project (see [SETUP.md](./SETUP.md))
2. Confirm Cloudflare Worker **`CRON_SECRET`** is set (`wrangler secret put CRON_SECRET`) — see [DEPLOY.md](./DEPLOY.md)
3. Run `npx wrangler tail houseplanthospital` after deploy; at `:00/:05` expect `[cron] /api/cron/mailchimp-outbox ok`
4. Smoke-test iPad check-in (3 plants) and plant detail (bugs + autosave notes)
