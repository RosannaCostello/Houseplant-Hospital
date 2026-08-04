-- HIL-106 Phase A/B: collected_at backfill, bugs_found_ever sticky trigger,
-- search_path on staff helpers, dashboard indexes

-- Backfill collected_at from latest status_history when missing
update public.plants p
set collected_at = h.changed_at
from (
  select distinct on (plant_id)
    plant_id,
    created_at as changed_at
  from public.status_history
  where new_status = 'collected'
  order by plant_id, created_at desc
) h
where p.id = h.plant_id
  and p.status = 'collected'
  and p.collected_at is null;

-- Sticky bugs_found_ever: once true, never cleared; set when bugs_found becomes true
create or replace function public.plants_sticky_bugs_found_ever()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.bugs_found_ever is true then
      new.bugs_found_ever := true;
    elsif new.bugs_found is true then
      new.bugs_found_ever := true;
    end if;
  elsif tg_op = 'INSERT' then
    if new.bugs_found is true then
      new.bugs_found_ever := true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists plants_sticky_bugs_found_ever on public.plants;
create trigger plants_sticky_bugs_found_ever
before insert or update on public.plants
for each row execute function public.plants_sticky_bugs_found_ever();

-- Harden is_staff / is_admin search_path (SECURITY DEFINER hygiene)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- Dashboard / history access patterns
create index if not exists plants_active_status_created_at_idx
  on public.plants (status, created_at desc)
  where status not in ('collected', 'dead');

create index if not exists status_history_plant_status_created_at_idx
  on public.status_history (plant_id, new_status, created_at desc);

-- Analytics: pests “ever found” for sticky semantics
create or replace function public.analytics_period_summary(
  p_start timestamptz,
  p_end timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with intake as (
    select
      p.id,
      p.size,
      p.bugs_found,
      p.bugs_found_ever,
      p.plant_category,
      v.customer_id
    from public.plants p
    join public.visits v on v.id = p.visit_id
    where v.checkin_date >= p_start
      and v.checkin_date < p_end
  ),
  collected as (
    select
      p.id,
      p.final_price,
      extract(epoch from (p.collected_at - v.checkin_date)) / 86400.0 as turnaround_days
    from public.plants p
    join public.visits v on v.id = p.visit_id
    where p.collected_at >= p_start
      and p.collected_at < p_end
  ),
  period_customers as (
    select distinct v.customer_id
    from public.visits v
    where v.checkin_date >= p_start
      and v.checkin_date < p_end
  ),
  first_visits as (
    select v.customer_id, min(v.checkin_date) as first_checkin
    from public.visits v
    join period_customers pc on pc.customer_id = v.customer_id
    group by v.customer_id
  )
  select jsonb_build_object(
    'plantsCheckedIn', (select count(*) from intake),
    'plantsCollected', (select count(*) from collected),
    'treatmentRevenue', (
      select coalesce(sum(final_price), 0)
      from collected
      where final_price is not null
    ),
    'pricedCollectedPlants', (
      select count(*)
      from collected
      where final_price is not null
    ),
    'medianTurnaroundDays', (
      select percentile_cont(0.5) within group (order by turnaround_days)
      from collected
      where turnaround_days >= 0
    ),
    'averageValuePerCollectedPlant', (
      select case
        when count(*) filter (where final_price is not null) = 0 then null
        else sum(final_price) filter (where final_price is not null)
          / count(*) filter (where final_price is not null)
      end
      from collected
    ),
    'uniqueCustomers', (select count(*) from period_customers),
    'newCustomers', (
      select count(*)
      from first_visits
      where first_checkin >= p_start and first_checkin < p_end
    ),
    'returningCustomers', (
      select count(*)
      from first_visits
      where first_checkin < p_start
    ),
    'pestsFound', (select count(*) from intake where bugs_found_ever = true),
    'pestsAssessed', (select count(*) from intake where bugs_found is not null),
    'pestsUnassessed', (select count(*) from intake where bugs_found is null),
    'propagations', (select count(*) from intake where plant_category = 'propagation')
  );
$$;

alter table public.visits
  drop constraint if exists visits_payment_settled_via_check;

alter table public.visits
  add constraint visits_payment_settled_via_check
  check (
    payment_settled_via is null
    or payment_settled_via in ('shopify', 'other')
  );

create unique index if not exists visits_shopify_order_id_unique_idx
  on public.visits (shopify_order_id)
  where shopify_order_id is not null;

