-- Houseplant Hospital 2.0 - core schema (Phase 1)
-- Note: RLS policies are added in a subsequent migration.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'plant_status') then
    create type plant_status as enum (
      'check_in',
      'in_surgery',
      'outpatient',
      'collected',
      'quarantine',
      'dead'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('admin', 'staff');
  end if;
end $$;

-- ---------- Shared helpers ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Auth-linked profiles ----------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'staff',
  name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------- Core operational model ----------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  mailchimp_contact_id text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_email_unique unique (email)
);

create index if not exists customers_email_idx on public.customers (email);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  checkin_date timestamptz not null default now(),
  notes text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists visits_customer_id_idx on public.visits (customer_id);
create index if not exists visits_checkin_date_idx on public.visits (checkin_date desc);

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  name text,
  species text,
  size text not null, -- XS/S/M/L/XL (validated at app layer initially; can become enum later)
  status plant_status not null default 'check_in',
  bugs_found boolean not null default false,
  pricing_modifier numeric(8,4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plants_visit_id_idx on public.plants (visit_id);
create index if not exists plants_status_idx on public.plants (status);
create index if not exists plants_created_at_idx on public.plants (created_at desc);

create trigger plants_set_updated_at
before update on public.plants
for each row execute function public.set_updated_at();

-- ---------- Photos ----------

create table if not exists public.plant_photos (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  storage_path text not null,
  thumbnail_path text,
  created_at timestamptz not null default now()
);

create index if not exists plant_photos_plant_id_idx on public.plant_photos (plant_id);
create index if not exists plant_photos_created_at_idx on public.plant_photos (created_at desc);

-- ---------- Notes ----------

create table if not exists public.treatment_notes (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  author_id uuid references public.profiles(user_id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists treatment_notes_plant_id_idx on public.treatment_notes (plant_id);
create index if not exists treatment_notes_created_at_idx on public.treatment_notes (created_at desc);

create table if not exists public.care_tips (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists care_tips_plant_id_idx on public.care_tips (plant_id);
create index if not exists care_tips_created_at_idx on public.care_tips (created_at desc);

-- ---------- Status history ----------

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  previous_status plant_status,
  new_status plant_status not null,
  changed_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists status_history_plant_id_idx on public.status_history (plant_id);
create index if not exists status_history_created_at_idx on public.status_history (created_at desc);

-- ---------- Pricing configuration + adjustments ----------

create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  size text, -- XS/S/M/L/XL for base prices
  rule_type text not null, -- e.g. base_price, bugs_surcharge
  amount numeric(10,2) not null default 0,
  percent numeric(6,3) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pricing_rules_active_idx on public.pricing_rules (active);
create index if not exists pricing_rules_type_idx on public.pricing_rules (rule_type);
create index if not exists pricing_rules_size_idx on public.pricing_rules (size);

create trigger pricing_rules_set_updated_at
before update on public.pricing_rules
for each row execute function public.set_updated_at();

create table if not exists public.pricing_adjustments (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  adjustment_type text not null, -- e.g. bugs_surcharge
  amount numeric(10,2),
  percent numeric(6,3),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists pricing_adjustments_plant_id_idx on public.pricing_adjustments (plant_id);
create index if not exists pricing_adjustments_created_at_idx on public.pricing_adjustments (created_at desc);

-- ---------- Mailchimp outbox ----------

create table if not exists public.mailchimp_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending/sent/failed
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mailchimp_events_status_idx on public.mailchimp_events (status);
create index if not exists mailchimp_events_created_at_idx on public.mailchimp_events (created_at desc);

-- ---------- Print job outbox ----------

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid references public.plants(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending/sent/failed
  created_at timestamptz not null default now()
);

create index if not exists print_jobs_status_idx on public.print_jobs (status);
create index if not exists print_jobs_created_at_idx on public.print_jobs (created_at desc);

