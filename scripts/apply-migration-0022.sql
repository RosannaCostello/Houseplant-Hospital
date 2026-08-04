-- HIL-106 Phase D/G: atomic status update, public case RPC, visit rollback RPC,
-- staff DELETE lockdown on core tables (customers / visits / plants / status_history)

-- ---------------------------------------------------------------------------
-- Atomic plant status + history (business gates stay in app code)
-- ---------------------------------------------------------------------------
create or replace function public.update_plant_status_atomic(
  p_plant_id uuid,
  p_new_status public.plant_status,
  p_collected_at timestamptz default null,
  p_final_price numeric default null
)
returns table (previous_status public.plant_status, new_status public.plant_status)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plant public.plants%rowtype;
  v_allowed public.plant_status[];
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'You must be signed in as staff to update plant status.';
  end if;

  select p.*
  into v_plant
  from public.plants p
  where p.id = p_plant_id
  for update;

  if v_plant.id is null then
    raise exception 'Plant not found.';
  end if;

  if v_plant.status = p_new_status then
    previous_status := v_plant.status;
    new_status := p_new_status;
    return next;
    return;
  end if;

  v_allowed := case v_plant.status
    when 'check_in' then array['quarantine', 'in_surgery']::public.plant_status[]
    when 'quarantine' then array['in_surgery']::public.plant_status[]
    when 'propagation' then array['in_surgery']::public.plant_status[]
    when 'in_surgery' then array['outpatient', 'dead']::public.plant_status[]
    when 'outpatient' then array['collected']::public.plant_status[]
    else array[]::public.plant_status[]
  end;

  if not (p_new_status = any (v_allowed)) then
    raise exception 'Invalid status transition from % to %.', v_plant.status, p_new_status;
  end if;

  update public.plants
  set
    status = p_new_status,
    collected_at = case
      when p_new_status = 'collected' then coalesce(p_collected_at, now())
      else collected_at
    end,
    final_price = case
      when p_new_status = 'collected' and p_final_price is not null then p_final_price
      else final_price
    end
  where id = p_plant_id;

  insert into public.status_history (plant_id, previous_status, new_status, changed_by)
  values (p_plant_id, v_plant.status, p_new_status, auth.uid());

  previous_status := v_plant.status;
  new_status := p_new_status;
  return next;
end;
$$;

revoke all on function public.update_plant_status_atomic(uuid, public.plant_status, timestamptz, numeric) from public;
grant execute on function public.update_plant_status_atomic(uuid, public.plant_status, timestamptz, numeric)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Public case page: only safe columns (no customer PII)
-- ---------------------------------------------------------------------------
create or replace function public.get_public_plant_case(p_plant_id uuid)
returns table (
  id uuid,
  name text,
  species text,
  status public.plant_status,
  checkin_date timestamptz,
  photo_storage_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.species,
    p.status,
    v.checkin_date,
    (
      select pp.storage_path
      from public.plant_photos pp
      where pp.plant_id = p.id
      order by pp.created_at desc
      limit 1
    ) as photo_storage_path
  from public.plants p
  join public.visits v on v.id = p.visit_id
  where p.id = p_plant_id;
$$;

revoke all on function public.get_public_plant_case(uuid) from public;
grant execute on function public.get_public_plant_case(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Check-in rollback: staff may only delete their own recent unfinished visit
-- ---------------------------------------------------------------------------
create or replace function public.rollback_check_in_visit(p_visit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid;
  v_created_at timestamptz;
  v_plant_count int;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'You must be signed in as staff to roll back a visit.';
  end if;

  select created_by, created_at
  into v_created_by, v_created_at
  from public.visits
  where id = p_visit_id
  for update;

  if v_created_by is null then
    return;
  end if;

  if v_created_by is distinct from auth.uid() then
    raise exception 'You can only roll back visits you created.';
  end if;

  if v_created_at < now() - interval '2 hours' then
    raise exception 'This visit is too old to roll back automatically.';
  end if;

  select count(*) into v_plant_count
  from public.plants
  where visit_id = p_visit_id
    and status not in ('check_in', 'quarantine');

  if v_plant_count > 0 then
    raise exception 'This visit already has plants past check-in and cannot be rolled back.';
  end if;

  delete from public.visits where id = p_visit_id;
end;
$$;

revoke all on function public.rollback_check_in_visit(uuid) from public;
grant execute on function public.rollback_check_in_visit(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: remove open DELETE on customers / visits / plants / status_history
-- (drafts, notes, tips, adjustments keep delete for product flows)
-- ---------------------------------------------------------------------------
drop policy if exists "customers_rw_staff" on public.customers;
create policy "customers_select_staff" on public.customers
  for select to authenticated using (public.is_staff());
create policy "customers_insert_staff" on public.customers
  for insert to authenticated with check (public.is_staff());
create policy "customers_update_staff" on public.customers
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "visits_rw_staff" on public.visits;
create policy "visits_select_staff" on public.visits
  for select to authenticated using (public.is_staff());
create policy "visits_insert_staff" on public.visits
  for insert to authenticated with check (public.is_staff());
create policy "visits_update_staff" on public.visits
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "plants_rw_staff" on public.plants;
create policy "plants_select_staff" on public.plants
  for select to authenticated using (public.is_staff());
create policy "plants_insert_staff" on public.plants
  for insert to authenticated with check (public.is_staff());
create policy "plants_update_staff" on public.plants
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "status_history_rw_staff" on public.status_history;
create policy "status_history_select_staff" on public.status_history
  for select to authenticated using (public.is_staff());
create policy "status_history_insert_staff" on public.status_history
  for insert to authenticated with check (public.is_staff());
