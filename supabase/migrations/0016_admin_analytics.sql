-- HIL-92: admin analytics aggregates, comparisons and operational snapshot
-- Depends on 0015_plant_propagation.sql.

create index if not exists status_history_status_created_at_idx
  on public.status_history (new_status, created_at desc);

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
    'pestsFound', (select count(*) from intake where bugs_found = true),
    'pestsAssessed', (select count(*) from intake where bugs_found is not null),
    'pestsUnassessed', (select count(*) from intake where bugs_found is null),
    'propagations', (select count(*) from intake where plant_category = 'propagation')
  );
$$;

revoke all on function public.analytics_period_summary(timestamptz, timestamptz) from public;
revoke all on function public.analytics_period_summary(timestamptz, timestamptz) from authenticated;

create or replace function public.get_admin_analytics(
  p_start timestamptz,
  p_end timestamptz,
  p_previous_start timestamptz,
  p_previous_end timestamptz,
  p_bucket text default 'day'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  bucket_interval interval;
  current_summary jsonb;
  previous_summary jsonb;
  current_series jsonb;
  previous_series jsonb;
  size_breakdown jsonb;
  lane_snapshot jsonb;
  oldest_active jsonb;
  payment_snapshot jsonb;
  draft_snapshot jsonb;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_start is null or p_end is null or p_start >= p_end then
    raise exception 'Invalid analytics date range.';
  end if;

  if p_previous_start is null
    or p_previous_end is null
    or p_previous_start >= p_previous_end then
    raise exception 'Invalid analytics comparison range.';
  end if;

  if p_end - p_start > interval '5 years' then
    raise exception 'Analytics date range cannot exceed five years.';
  end if;

  if p_bucket not in ('day', 'week', 'month') then
    raise exception 'Invalid analytics bucket.';
  end if;

  bucket_interval := case p_bucket
    when 'day' then interval '1 day'
    when 'week' then interval '1 week'
    else interval '1 month'
  end;

  current_summary := public.analytics_period_summary(p_start, p_end);
  previous_summary := public.analytics_period_summary(p_previous_start, p_previous_end);

  with buckets as (
    select generate_series(
      date_trunc(p_bucket, p_start at time zone 'Europe/London'),
      date_trunc(p_bucket, (p_end - interval '1 microsecond') at time zone 'Europe/London'),
      bucket_interval
    ) as local_start
  ),
  intake as (
    select
      date_trunc(p_bucket, v.checkin_date at time zone 'Europe/London') as local_start,
      count(p.id) as count
    from public.plants p
    join public.visits v on v.id = p.visit_id
    where v.checkin_date >= p_start and v.checkin_date < p_end
    group by 1
  ),
  collections as (
    select
      date_trunc(p_bucket, p.collected_at at time zone 'Europe/London') as local_start,
      count(*) as count,
      coalesce(sum(p.final_price), 0) as revenue
    from public.plants p
    where p.collected_at >= p_start and p.collected_at < p_end
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'bucket', to_char(b.local_start, 'YYYY-MM-DD'),
        'checkedIn', coalesce(i.count, 0),
        'collected', coalesce(c.count, 0),
        'revenue', coalesce(c.revenue, 0)
      )
      order by b.local_start
    ),
    '[]'::jsonb
  )
  into current_series
  from buckets b
  left join intake i using (local_start)
  left join collections c using (local_start);

  with buckets as (
    select generate_series(
      date_trunc(p_bucket, p_previous_start at time zone 'Europe/London'),
      date_trunc(p_bucket, (p_previous_end - interval '1 microsecond') at time zone 'Europe/London'),
      bucket_interval
    ) as local_start
  ),
  intake as (
    select
      date_trunc(p_bucket, v.checkin_date at time zone 'Europe/London') as local_start,
      count(p.id) as count
    from public.plants p
    join public.visits v on v.id = p.visit_id
    where v.checkin_date >= p_previous_start and v.checkin_date < p_previous_end
    group by 1
  ),
  collections as (
    select
      date_trunc(p_bucket, p.collected_at at time zone 'Europe/London') as local_start,
      count(*) as count,
      coalesce(sum(p.final_price), 0) as revenue
    from public.plants p
    where p.collected_at >= p_previous_start and p.collected_at < p_previous_end
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'bucket', to_char(b.local_start, 'YYYY-MM-DD'),
        'checkedIn', coalesce(i.count, 0),
        'collected', coalesce(c.count, 0),
        'revenue', coalesce(c.revenue, 0)
      )
      order by b.local_start
    ),
    '[]'::jsonb
  )
  into previous_series
  from buckets b
  left join intake i using (local_start)
  left join collections c using (local_start);

  select coalesce(
    jsonb_agg(
      jsonb_build_object('size', sizes.size, 'count', sizes.count)
      order by case sizes.size
        when 'XS' then 1 when 'S' then 2 when 'M' then 3
        when 'L' then 4 when 'XL' then 5 else 6
      end
    ),
    '[]'::jsonb
  )
  into size_breakdown
  from (
    select p.size, count(*) as count
    from public.plants p
    join public.visits v on v.id = p.visit_id
    where v.checkin_date >= p_start and v.checkin_date < p_end
    group by p.size
  ) sizes;

  with active as (
    select
      p.id,
      p.status,
      coalesce(latest_status.entered_at, p.created_at) as entered_at
    from public.plants p
    left join lateral (
      select sh.created_at as entered_at
      from public.status_history sh
      where sh.plant_id = p.id and sh.new_status = p.status
      order by sh.created_at desc
      limit 1
    ) latest_status on true
    where p.status not in ('collected', 'dead')
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'status', grouped.status,
        'count', grouped.count,
        'medianAgeDays', grouped.median_age_days
      )
      order by case grouped.status
        when 'check_in' then 1 when 'quarantine' then 2
        when 'propagation' then 3 when 'in_surgery' then 4
        when 'outpatient' then 5 else 6
      end
    ),
    '[]'::jsonb
  )
  into lane_snapshot
  from (
    select
      status,
      count(*) as count,
      percentile_cont(0.5) within group (
        order by greatest(0, extract(epoch from (now() - entered_at)) / 86400.0)
      ) as median_age_days
    from active
    group by status
  ) grouped;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'plantId', ranked.id,
        'customerName', ranked.customer_name,
        'plantName', ranked.plant_name,
        'status', ranked.status,
        'ageDays', ranked.age_days
      )
      order by ranked.age_days desc
    ),
    '[]'::jsonb
  )
  into oldest_active
  from (
    select
      p.id,
      concat_ws(' ', c.first_name, c.last_name) as customer_name,
      p.name as plant_name,
      p.status,
      floor(greatest(
        0,
        extract(epoch from (now() - coalesce(latest_status.entered_at, p.created_at))) / 86400.0
      ))::integer as age_days
    from public.plants p
    join public.visits v on v.id = p.visit_id
    join public.customers c on c.id = v.customer_id
    left join lateral (
      select sh.created_at as entered_at
      from public.status_history sh
      where sh.plant_id = p.id and sh.new_status = p.status
      order by sh.created_at desc
      limit 1
    ) latest_status on true
    where p.status not in ('collected', 'dead')
    order by age_days desc
    limit 8
  ) ranked;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('status', payments.payment_status, 'count', payments.count)
      order by payments.payment_status
    ),
    '[]'::jsonb
  )
  into payment_snapshot
  from (
    select v.payment_status::text, count(*) as count
    from public.visits v
    where v.payment_status in ('queued', 'loaded', 'pay_at_collection')
    group by v.payment_status
  ) payments;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('step', drafts.draft_step, 'count', drafts.count)
      order by drafts.draft_step
    ),
    '[]'::jsonb
  )
  into draft_snapshot
  from (
    select d.draft_step::text, count(*) as count
    from public.check_in_drafts d
    group by d.draft_step
  ) drafts;

  return jsonb_build_object(
    'range', jsonb_build_object(
      'start', p_start,
      'end', p_end,
      'previousStart', p_previous_start,
      'previousEnd', p_previous_end,
      'bucket', p_bucket,
      'timezone', 'Europe/London',
      'generatedAt', now()
    ),
    'current', current_summary,
    'previous', previous_summary,
    'series', current_series,
    'previousSeries', previous_series,
    'sizeBreakdown', size_breakdown,
    'laneSnapshot', lane_snapshot,
    'oldestActive', oldest_active,
    'paymentSnapshot', payment_snapshot,
    'draftSnapshot', draft_snapshot
  );
end;
$$;

revoke all on function public.get_admin_analytics(timestamptz, timestamptz, timestamptz, timestamptz, text) from public;
grant execute on function public.get_admin_analytics(timestamptz, timestamptz, timestamptz, timestamptz, text) to authenticated;
