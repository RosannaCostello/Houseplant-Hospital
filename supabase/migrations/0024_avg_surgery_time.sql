-- HIL-101: average minutes in surgery (app data only — exclude Zoho imports)

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
  ),
  -- Completed surgery stints that ended in this period (app visits only).
  surgery_segments as (
    select
      extract(epoch from (exit_row.created_at - enter_row.created_at)) / 60.0 as minutes_in_surgery
    from public.status_history exit_row
    join public.plants p on p.id = exit_row.plant_id
    join public.visits v on v.id = p.visit_id
    join lateral (
      select sh.created_at
      from public.status_history sh
      where sh.plant_id = exit_row.plant_id
        and sh.new_status = 'in_surgery'
        and sh.created_at <= exit_row.created_at
      order by sh.created_at desc
      limit 1
    ) enter_row on true
    where exit_row.previous_status = 'in_surgery'
      and exit_row.new_status in ('outpatient', 'dead')
      and exit_row.created_at >= p_start
      and exit_row.created_at < p_end
      and coalesce(v.notes, '') not in ('zoho-import', 'zoho-import-final')
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
    'averageMinutesInSurgery', (
      select case
        when count(*) = 0 then null
        else avg(minutes_in_surgery)
      end
      from surgery_segments
      where minutes_in_surgery >= 0
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
