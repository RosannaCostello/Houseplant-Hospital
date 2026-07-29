-- Apply in Supabase SQL editor (HIL-93)

alter table public.visits
  add column if not exists payment_settled_via text;

comment on column public.visits.payment_settled_via is
  'How unpaid visit payment was settled when not via Shopify order webhook (e.g. other).';
