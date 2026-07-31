# Propagation feature handoff

> **Ops / staff usage:** see [operator-handbook.md](./operator-handbook.md) (Propagate workflow). This file is an engineering resume note only.

## Status

HIL-90 / HIL-91 propagation is implemented and deployed. Prefer the operator handbook for when staff can propagate and what happens next.

## Implemented

- One-time, atomic propagation from an eligible standard plant in Surgery
- Pests-free eligibility and permanent no-pests constraint for child plants
- New child visit under the same customer, containing one plant (1/1)
- Permanent propagation category and lineage to the source plant
- Propagation status/lane, days-in-propagation label and transition to Surgery
- Propagate actions on dashboard/detail with size picker and irreversible confirmation
- Disabled Propagate action after the source has produced a child
- Persistent Propagation badge on dashboard and plant detail
- Dedicated Shopify propagation variants and synced pricing
- Pay-at-collection POS payload with `_hh_visit_id`
- Propagation prices in Settings

## Resume steps

1. Apply `supabase/migrations/0015_plant_propagation.sql` in Supabase SQL Editor.
   - Alternatively add `SUPABASE_DB_PASSWORD` to `.env.local` and run `npm run db:apply-0015`.
2. Run `npm run db:verify`; all migrations, including both 0015 checks, must pass.
3. Run:
   - `node scripts/clean-build-dirs.mjs`
   - `npx tsc --noEmit`
   - `npm run build`
4. Deploy with `npm run deploy:live`.
5. Open Settings and run **Sync from Shopify** so `propagation_amount` is populated.
6. Live test:
   - Propagate a pests-free standard plant in Surgery.
   - Confirm the child appears in Propagation as 1/1 with its badge and selected size.
   - Confirm the source Propagate action becomes disabled.
   - Confirm a duplicate attempt is rejected.
   - Confirm the child has no pests control.
   - Move the child to Surgery and confirm its Propagation badge remains.
   - Verify its collection POS payload uses the supplied propagation variant.
7. Update HIL-90 and HIL-91 after successful verification.

## Verification already completed

- Propagation files pass ESLint.
- `npx tsc --noEmit` passes after clearing stale `.next` output.
- `npm run build` passes.
- Full-repository lint still reports pre-existing generated Shopify POS extension errors; these are unrelated to this feature.
