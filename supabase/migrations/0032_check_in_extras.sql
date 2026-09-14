-- Pot size consent at check-in, hospital staff roster, surgery sign-off attribution.

alter table public.visits
  add column if not exists pot_size_change_consent boolean not null default true;

alter table public.check_in_drafts
  add column if not exists pot_size_change_consent boolean not null default true;

create table if not exists public.hospital_staff (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists hospital_staff_active_sort_idx
  on public.hospital_staff (active, sort_order);

alter table public.plants
  add column if not exists surgery_completed_by uuid references public.hospital_staff(id) on delete set null;

create index if not exists plants_surgery_completed_by_idx
  on public.plants (surgery_completed_by);

alter table public.hospital_staff enable row level security;

drop policy if exists "hospital_staff_select_staff" on public.hospital_staff;
create policy "hospital_staff_select_staff"
on public.hospital_staff
for select
to authenticated
using (public.is_staff());

drop policy if exists "hospital_staff_admin_write" on public.hospital_staff;
create policy "hospital_staff_admin_write"
on public.hospital_staff
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
