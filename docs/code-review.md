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

**Explicitly out of scope for this pass:** disable kanban moves when `status === collected` (deferred).

---

## Deferred — important (fix soon)

| Issue | Why | Where |
|-------|-----|-------|
| Empty collection price coerces to £0 | `Number("")` → 0; accidental free collection | `collection-section.tsx`, `collect-plant.ts` |
| `window.alert` for kanban errors | Inconsistent, poor on iPad | `plant-card-status-menu.tsx` |
| Controlled `<select>` DOM recovery on error | Fights React state; wrong lane shown | `plant-card-status-menu.tsx` |
| Check-in photos not in session draft | Refresh loses captured photos | `photos-step-form.tsx`, `draft.ts` |
| Rollback doesn’t delete storage files | Orphan blobs in `plant-photos` | `upload-plant-photo.ts` `removePlantPhotoFiles` |
| Draft JSON parsed without validation | Trusts `sessionStorage` | `lib/check-in/draft.ts` |
| Plant detail hard-crashes if pricing fails | Whole page down for one config issue | `app/app/plants/[id]/page.tsx` |
| Check-in doesn’t write `status_history` | Audit gap at lifecycle start | `create-check-in-records.ts` |
| Collected plants movable on kanban | Contradicts detail-page collected state | `update-plant-status.ts`, `plant-card-status-menu.tsx` |
| `getPricingSettings()` no auth guard | Service-role loader safe only if callers check admin | `get-pricing-settings.ts` |
| Route IDs not validated as UUID | Opaque errors vs clean 404 | `app/**/[id]/page.tsx` |
| Customer upsert overwrites PII by email | Typo’d email could overwrite wrong customer | `create-check-in-records.ts` |

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
| Dead / half-finished | `plant-case-url.ts`, `removePlantPhotoFiles` |

---

*Generated from agent code review session. Update this file when items are fixed or deprioritised.*
