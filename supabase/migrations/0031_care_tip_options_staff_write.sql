-- HIL-124: staff may add care tip options from Update plant "Other".

drop policy if exists "care_tip_options_insert_staff" on public.care_tip_options;
create policy "care_tip_options_insert_staff"
on public.care_tip_options
for insert
to authenticated
with check (public.is_staff());

drop policy if exists "care_tip_options_update_staff" on public.care_tip_options;
create policy "care_tip_options_update_staff"
on public.care_tip_options
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());
