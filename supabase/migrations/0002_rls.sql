-- Houseplant Hospital 2.0 - RLS + roles (Phase 1)

-- Enable RLS on all app tables
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.visits enable row level security;
alter table public.plants enable row level security;
alter table public.plant_photos enable row level security;
alter table public.treatment_notes enable row level security;
alter table public.care_tips enable row level security;
alter table public.status_history enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.pricing_adjustments enable row level security;
alter table public.mailchimp_events enable row level security;
alter table public.print_jobs enable row level security;

-- Helper: is authenticated (Supabase JWT present)
create or replace function public.is_authenticated()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

-- Helper: is admin (from profiles.role)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- ---------- profiles ----------
-- Users can read their own profile; admins can read all.
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Users can update their own name; admins can update any profile.
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- Only admins can insert profiles (for manual user setup).
drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

-- ---------- Operational tables (staff) ----------
-- Staff: read/write all operational records (internal app).
-- Admin-only: pricing_rules (config), and optionally outboxes.

-- customers
drop policy if exists "customers_rw_authenticated" on public.customers;
create policy "customers_rw_authenticated"
on public.customers
for all
to authenticated
using (public.is_authenticated())
with check (public.is_authenticated());

-- visits
drop policy if exists "visits_rw_authenticated" on public.visits;
create policy "visits_rw_authenticated"
on public.visits
for all
to authenticated
using (public.is_authenticated())
with check (public.is_authenticated());

-- plants
drop policy if exists "plants_rw_authenticated" on public.plants;
create policy "plants_rw_authenticated"
on public.plants
for all
to authenticated
using (public.is_authenticated())
with check (public.is_authenticated());

-- plant_photos
drop policy if exists "plant_photos_rw_authenticated" on public.plant_photos;
create policy "plant_photos_rw_authenticated"
on public.plant_photos
for all
to authenticated
using (public.is_authenticated())
with check (public.is_authenticated());

-- treatment_notes
drop policy if exists "treatment_notes_rw_authenticated" on public.treatment_notes;
create policy "treatment_notes_rw_authenticated"
on public.treatment_notes
for all
to authenticated
using (public.is_authenticated())
with check (public.is_authenticated());

-- care_tips
drop policy if exists "care_tips_rw_authenticated" on public.care_tips;
create policy "care_tips_rw_authenticated"
on public.care_tips
for all
to authenticated
using (public.is_authenticated())
with check (public.is_authenticated());

-- status_history
drop policy if exists "status_history_rw_authenticated" on public.status_history;
create policy "status_history_rw_authenticated"
on public.status_history
for all
to authenticated
using (public.is_authenticated())
with check (public.is_authenticated());

-- pricing_adjustments (staff can write; pricing_rules remain admin-only)
drop policy if exists "pricing_adjustments_rw_authenticated" on public.pricing_adjustments;
create policy "pricing_adjustments_rw_authenticated"
on public.pricing_adjustments
for all
to authenticated
using (public.is_authenticated())
with check (public.is_authenticated());

-- pricing_rules (admin-only)
drop policy if exists "pricing_rules_read_admin" on public.pricing_rules;
create policy "pricing_rules_read_admin"
on public.pricing_rules
for select
to authenticated
using (public.is_admin());

drop policy if exists "pricing_rules_write_admin" on public.pricing_rules;
create policy "pricing_rules_write_admin"
on public.pricing_rules
for insert, update, delete
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- mailchimp_events (admin-only for now; server will usually use service role)
drop policy if exists "mailchimp_events_admin" on public.mailchimp_events;
create policy "mailchimp_events_admin"
on public.mailchimp_events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- print_jobs (admin-only for now; server will usually use service role)
drop policy if exists "print_jobs_admin" on public.print_jobs;
create policy "print_jobs_admin"
on public.print_jobs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

