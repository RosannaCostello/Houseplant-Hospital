-- HIL-127: allow propagating plants with pests; child inherits pests Yes.

-- Drop the old “propagation children must be pest-free” check (also in 0036).
alter table public.plants
  drop constraint if exists plants_propagation_no_pests_check;

create or replace function public.propagate_plant(
  p_source_plant_id uuid,
  p_new_visit_id uuid,
  p_new_plant_id uuid,
  p_size text,
  p_pos_line_items jsonb
)
returns table (visit_id uuid, plant_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_plant public.plants%rowtype;
  source_customer_id uuid;
  child_bugs_found boolean;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'You must be signed in as staff to propagate a plant.';
  end if;

  if p_size not in ('Mini', 'S', 'M', 'L', 'XL') then
    raise exception 'Invalid propagation size.';
  end if;

  select p.*
  into source_plant
  from public.plants p
  where p.id = p_source_plant_id
  for update;

  if source_plant.id is null then
    raise exception 'Source plant not found.';
  end if;

  select v.customer_id
  into source_customer_id
  from public.visits v
  where v.id = source_plant.visit_id;

  if source_plant.plant_category <> 'standard' then
    raise exception 'A propagation plant cannot be propagated.';
  end if;

  if source_plant.status <> 'in_surgery' then
    raise exception 'Only a plant in surgery can be propagated.';
  end if;

  if exists (
    select 1 from public.plants child
    where child.source_plant_id = p_source_plant_id
  ) then
    raise exception 'This plant has already been propagated.';
  end if;

  -- Source pests Yes or Not sure → child pests Yes; source No → child No.
  child_bugs_found := source_plant.bugs_found is distinct from false;

  insert into public.visits (
    id,
    customer_id,
    checkin_date,
    notes,
    created_by,
    payment_status,
    pos_line_items
  ) values (
    p_new_visit_id,
    source_customer_id,
    now(),
    null,
    auth.uid(),
    'pay_at_collection',
    p_pos_line_items
  );

  insert into public.plants (
    id,
    visit_id,
    name,
    species,
    size,
    status,
    bugs_found,
    bugs_found_ever,
    pricing_modifier,
    plant_category,
    source_plant_id
  ) values (
    p_new_plant_id,
    p_new_visit_id,
    source_plant.name,
    source_plant.species,
    p_size,
    'propagation',
    child_bugs_found,
    child_bugs_found,
    0,
    'propagation',
    p_source_plant_id
  );

  insert into public.status_history (
    plant_id,
    previous_status,
    new_status,
    changed_by
  ) values (
    p_new_plant_id,
    null,
    'propagation',
    auth.uid()
  );

  return query select p_new_visit_id, p_new_plant_id;
end;
$$;

revoke all on function public.propagate_plant(uuid, uuid, uuid, text, jsonb) from public;
grant execute on function public.propagate_plant(uuid, uuid, uuid, text, jsonb) to authenticated;
