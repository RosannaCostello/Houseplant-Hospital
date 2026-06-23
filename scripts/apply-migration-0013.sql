-- 0013_check_in_drafts.sql — run in Supabase SQL editor (Dashboard → SQL → New query)
-- Requires public.is_staff() (from 0007). Included here if 0007 was not applied yet.

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('staff', 'admin')
  );
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'check_in_draft_step') then
    create type check_in_draft_step as enum ('plants', 'photos');
  end if;
end $$;

create table if not exists public.check_in_drafts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  plants jsonb not null default '[]'::jsonb,
  draft_step check_in_draft_step not null default 'plants',
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists check_in_drafts_updated_at_idx
  on public.check_in_drafts (updated_at desc);

create index if not exists check_in_drafts_customer_id_idx
  on public.check_in_drafts (customer_id);

drop trigger if exists check_in_drafts_set_updated_at on public.check_in_drafts;
create trigger check_in_drafts_set_updated_at
before update on public.check_in_drafts
for each row execute function public.set_updated_at();

create table if not exists public.check_in_draft_photos (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.check_in_drafts(id) on delete cascade,
  plant_client_id text not null,
  storage_path text not null,
  thumbnail_path text not null,
  mime_type text not null,
  byte_size integer not null default 0,
  width integer not null default 0,
  height integer not null default 0,
  created_at timestamptz not null default now(),
  constraint check_in_draft_photos_draft_plant_unique unique (draft_id, plant_client_id)
);

create index if not exists check_in_draft_photos_draft_id_idx
  on public.check_in_draft_photos (draft_id);

alter table public.check_in_drafts enable row level security;
alter table public.check_in_draft_photos enable row level security;

drop policy if exists "check_in_drafts_rw_staff" on public.check_in_drafts;
create policy "check_in_drafts_rw_staff"
on public.check_in_drafts
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "check_in_draft_photos_rw_staff" on public.check_in_draft_photos;
create policy "check_in_draft_photos_rw_staff"
on public.check_in_draft_photos
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- Refresh PostgREST schema cache so the app sees new tables immediately
notify pgrst, 'reload schema';
