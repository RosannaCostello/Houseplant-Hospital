# Code review backlog (June 2026)

Internal code quality review of Houseplant Hospital 2.0. **Not** a product scope check.

**Status:** Critical items are being fixed in code; everything else is deferred. Track follow-up in Linear **[HIL-51](https://linear.app/hilda-houseplant-hospital/issue/HIL-51/tech-debt-code-review-backlog-deferred-fixes)**.

**Live URL:** https://houseplanthospital.hildaedinburgh.workers.dev

---

## In scope for this pass (critical — fix now)

| Issue | Why | Status |
|-------|-----|--------|
| Staff can self-promote to admin | `profiles` RLS allowed any user to change their own `role` | Fix: migration `0007_rls_hardening.sql` |
| RLS = any Auth user, not staff | Operational tables used `is_authenticated()` only | Fix: `is_staff()` helper + policy rewrites in `0007` |
| Unscoped visit delete (rollback) | Any user with a visit UUID could cascade-delete | Fix: `created_by` + UUID validation in rollback |
| Storage: any auth user all photos | Bucket policies only checked bucket name | Fix: migration `0008_storage_staff_only.sql` |
| Open redirect on login | Unvalidated `redirectTo` query param | Fix: `lib/auth/safe-redirect.ts` |
| Check-in bypasses server-action validation | Photos step called DB lib from browser, skipping Zod | Fix: route through `createCheckInRecords` server action |
| Collection form when status is collected | Form showed when `status === collected` but no `final_price` | Fix: `collection-section.tsx` branches on status first |

**Explicitly out of scope:** kanban lock when `status === collected` — **not needed**; staff intentionally keep collected plants movable on the board.

---

## Priority fixes (HIL-51 — June 2026)

| Issue | Why | Status |
|-------|-----|--------|
| Empty collection price coerces to £0 | `Number("")` → 0; accidental free collection | Fix: client + server validation in `collection-section.tsx`, `collect-plant.ts`, `collect-plant` action |
| `window.alert` for kanban errors | Inconsistent, poor on iPad | Fix: inline error in `plant-card-status-menu.tsx` |
| Check-in photos not in session draft | Refresh loses captured photos | Fix: `persistPhotos` in `photos-step-form.tsx` |
| Rollback doesn’t delete storage files | Orphan blobs in `plant-photos` | Fix: `removePlantPhotoFiles` on check-in failure in `photos-step-form.tsx` |
| Check-in doesn’t write `status_history` | Audit gap at lifecycle start | Fix: insert in `create-check-in-records.ts` |

---

## Second batch (HIL-51 — June 2026)

| Issue | Why | Status |
|-------|-----|--------|
| Controlled `<select>` DOM recovery on error | Select showed wrong lane after failed move | Fix: local `selectValue` state in `plant-card-status-menu.tsx` |
| Draft JSON parsed without validation | Trusts `sessionStorage` | Fix: `checkInDraftSchema` in `draft-schema.ts` |
| Plant detail hard-crashes if pricing fails | Whole page down for one config issue | Fix: nullable pricing + fallback UI |
| Route IDs not validated as UUID | Opaque errors vs clean 404 | Fix: `isValidRouteId` on detail routes |
| Customer upsert overwrites PII by email | Typo email could overwrite wrong customer | Fix: lookup + name match guard in `create-check-in-records.ts` |
| `getPricingSettings()` no auth guard | Service-role loader without caller check | Fix: `requireAdmin` in `get-pricing-settings.ts` |
| Kanban lock when `status === collected` | Flagged in review | **Not needed** — collected plants stay movable by design |

---

## Deferred — important (fix soon)

_All items from the previous important list are done or explicitly declined (kanban lock)._

---

## Deferred — nice-to-have

| Improvement | Why |
|-------------|-----|
| Extract `plantDisplayName`, `formatDateTimeEnGb`, `unwrapRelation`, `isPlantStatus` | 5–7 copies; drift risk |
| Merge treatment-notes + care-tips sections | Near-duplicate forms |
| Move `BugsFoundToggle` out of `<dl>` | Invalid HTML / a11y |
| Meaningful `alt` on plant photos | Screen readers + broken image fallback |
| `aria-invalid` / `role="alert"` on check-in errors | Errors visual-only today |
| Use or delete `getPlantCaseUrl` | Dead code vs Phase 4 QR URLs |
| Remove `PLANT_DETAIL_SELECT_LEGACY` shim | After migration 0006 on all envs |
| Cap bugs surcharge % in admin settings | Typo guardrail |
| Consistent `Button` vs raw `Link` on plant detail | Style cohesion |

---

## Preserve (do not refactor away casually)

| Pattern | Why |
|---------|-----|
| Middleware `getUser()` + `/settings` admin gate | JWT validated server-side |
| Server actions: Zod + `*WithClient` + `revalidatePath` | Clear boundary template |
| `lib/pricing/` engine | Shopify-ready; no hardcoded UI prices |
| `requireAdmin` in pricing updates | Defence in depth |
| Treatment note length limits in lib | Reusable validation |
| ILIKE escape on customer search | Wildcard injection |
| Service role not `NEXT_PUBLIC_*` | Secret stays server-side |
| Bugs toggle pessimistic UI | No false “saved” state |
| Collection `priceTouched` sync | Manual price vs auto estimate |
| Phase verification checklists in SETUP.md | Repeatable sign-off |

---

## Files to revisit later

| Area | Files |
|------|-------|
| Security / RLS | `0002_rls.sql`, `0003_storage.sql`, `0007_*`, `0008_*` |
| Auth | `middleware.ts`, `login/page.tsx`, `require-admin.ts` |
| Check-in | `photos-step-form.tsx`, `create-check-in-records.ts`, `upload-plant-photo.ts`, `draft.ts` |
| Plant workflow | `collection-section.tsx`, `collect-plant.ts`, `update-plant-status.ts` |
| Data layer duplication | `get-plant-detail.ts`, `get-dashboard-plants.ts`, `get-visit-detail.ts`, `get-public-plant-case.ts` |
| Pricing | `get-plant-pricing.ts`, `get-base-price-rules.ts`, `plants/[id]/page.tsx` |
| Dead / half-finished | `plant-case-url.ts` |

---

*Generated from agent code review session. Update this file when items are fixed or deprioritised.*
