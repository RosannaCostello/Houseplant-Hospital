-- HIL-90 / HIL-91: one-time plant propagation, lineage, pricing and POS visit

alter type public.plant_status add value if not exists 'propagation' before 'in_surgery';

alter table public.plants
  add column if not exists plant_category text not null default 'standard',
  add column if not exists source_plant_id uuid references public.plants(id) on delete restrict;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'plants_category_check'
  ) then
    alter table public.plants
      add constraint plants_category_check
      check (plant_category in ('standard', 'propagation'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'plants_propagation_source_check'
  ) then
    alter table public.plants
      add constraint plants_propagation_source_check
      check (
        (plant_category = 'standard' and source_plant_id is null)
        or
        (plant_category = 'propagation' and source_plant_id is not null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'plants_propagation_no_pests_check'
  ) then
    alter table public.plants
      add constraint plants_propagation_no_pests_check
      check (plant_category <> 'propagation' or bugs_found = false);
  end if;
end $$;

create unique index if not exists plants_one_propagation_per_source_idx
  on public.plants (source_plant_id)
  where source_plant_id is not null;

create index if not exists plants_category_idx
  on public.plants (plant_category);

alter table public.pricing_rules
  add column if not exists shopify_propagation_variant_id text,
  add column if not exists propagation_amount numeric(10,2);

-- Shopify product: Plant Propagation (15972533600637)
-- Shopify "Mini" maps to the app's XS size band.
update public.pricing_rules set shopify_propagation_variant_id = '58437113577853'
where rule_type = 'base_price' and size = 'XS' and active = true;

update public.pricing_rules set shopify_propagation_variant_id = '58437113610621'
where rule_type = 'base_price' and size = 'S' and active = true;

update public.pricing_rules set shopify_propagation_variant_id = '58437113643389'
where rule_type = 'base_price' and size = 'M' and active = true;

update public.pricing_rules set shopify_propagation_variant_id = '58437113676157'
where rule_type = 'base_price' and size = 'L' and active = true;

update public.pricing_rules set shopify_propagation_variant_id = '58437113708925'
where rule_type = 'base_price' and size = 'XL' and active = true;

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
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'You must be signed in as staff to propagate a plant.';
  end if;

  if p_size not in ('XS', 'S', 'M', 'L', 'XL') then
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

  if source_plant.bugs_found is distinct from false then
    raise exception 'A plant with pests cannot be propagated.';
  end if;

  if exists (
    select 1 from public.plants child
    where child.source_plant_id = p_source_plant_id
  ) then
    raise exception 'This plant has already been propagated.';
  end if;

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
    false,
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
