-- Code review: staff-only operational access + block self-service role escalation

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

-- profiles: non-admins cannot change their own role
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and role = (select p.role from public.profiles p where p.user_id = auth.uid())
  )
);

-- Operational tables: require staff profile (not merely any Auth user)

drop policy if exists "customers_rw_authenticated" on public.customers;
create policy "customers_rw_staff"
on public.customers
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "visits_rw_authenticated" on public.visits;
create policy "visits_rw_staff"
on public.visits
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "plants_rw_authenticated" on public.plants;
create policy "plants_rw_staff"
on public.plants
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "plant_photos_rw_authenticated" on public.plant_photos;
create policy "plant_photos_rw_staff"
on public.plant_photos
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "treatment_notes_rw_authenticated" on public.treatment_notes;
create policy "treatment_notes_rw_staff"
on public.treatment_notes
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "care_tips_rw_authenticated" on public.care_tips;
create policy "care_tips_rw_staff"
on public.care_tips
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "status_history_rw_authenticated" on public.status_history;
create policy "status_history_rw_staff"
on public.status_history
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "pricing_adjustments_rw_authenticated" on public.pricing_adjustments;
create policy "pricing_adjustments_rw_staff"
on public.pricing_adjustments
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

