# Analytics dashboard handoff

## Status

HIL-92 is implemented locally but **not deployed**. Date-range tests, scoped ESLint, TypeScript and the production build pass.

Deployment is paused because Supabase access is unavailable and the live database does not yet have migrations 0015 or 0016. Do not deploy the current branch until both migrations are applied.

## Implemented

- Admin-only `/app/analytics` route, middleware guard and bottom navigation item
- Europe/London date presets, custom ranges and equal-length prior-period comparisons
- KPI cards for collected treatment revenue, checked-in plants, collected plants, median turnaround and average collected value
- Throughput, prior-period and collected-revenue charts
- Plant-size, pests, customer and propagation breakdowns
- Current lane workload and median lane age
- Oldest-active-plant links
- Incomplete check-in and outstanding payment counts
- Admin-checked PostgreSQL analytics aggregation RPC
- Analytics date-boundary/DST checks

## Resume steps

1. Apply `supabase/migrations/0015_plant_propagation.sql`.
2. Apply `supabase/migrations/0016_admin_analytics.sql`.
3. Run `npm run db:verify`; checks through 0016 must pass.
4. Run **Sync from Shopify** in Settings so propagation prices are populated.
5. Run:
   - `npm run test:analytics-dates`
   - `npx tsc --noEmit`
   - `npm run build`
6. Deploy with `npm run deploy:live`.
7. Verify as an admin:
   - Analytics appears in the bottom navigation.
   - Presets and a custom range update the URL and all period metrics.
   - KPI figures reconcile with sampled database records.
   - Charts and current-operation sections render on iPad and desktop.
8. Verify as staff:
   - Analytics is absent from navigation.
   - Direct access to `/app/analytics` redirects to `/app`.
9. Complete live propagation/POS tests from `docs/propagation-handoff.md`.
10. Update HIL-90, HIL-91 and HIL-92 after successful live verification.

## Accuracy notes

- Revenue is the sum of `plants.final_price` at collection, not profit or Shopify gross sales.
- Pests rate excludes unassessed plants.
- Outstanding payment analytics shows counts only because an authoritative amount-paid ledger is not stored.
- Plants are the main throughput unit because propagation creates a separate visit.
