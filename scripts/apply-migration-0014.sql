-- 0014_pos_checkout.sql — run in Supabase SQL editor

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pos_payment_status') then
    create type pos_payment_status as enum (
      'not_started',
      'queued',
      'loaded',
      'paid',
      'pay_at_collection',
      'cancelled'
    );
  end if;
end $$;

alter table public.customers
  add column if not exists shopify_customer_id text;

create index if not exists customers_shopify_customer_id_idx
  on public.customers (shopify_customer_id)
  where shopify_customer_id is not null;

alter table public.check_in_drafts
  add column if not exists pos_checkout_status pos_payment_status not null default 'not_started',
  add column if not exists pos_checkout_queued_at timestamptz,
  add column if not exists pos_checkout_paid_at timestamptz,
  add column if not exists shopify_order_id text,
  add column if not exists pos_line_items jsonb;

create index if not exists check_in_drafts_pos_checkout_status_idx
  on public.check_in_drafts (pos_checkout_status)
  where pos_checkout_status in ('queued', 'loaded');

alter table public.visits
  add column if not exists payment_status pos_payment_status,
  add column if not exists shopify_order_id text,
  add column if not exists shopify_paid_at timestamptz,
  add column if not exists pos_line_items jsonb;

create index if not exists visits_payment_status_idx
  on public.visits (payment_status)
  where payment_status is not null and payment_status <> 'paid';

notify pgrst, 'reload schema';
