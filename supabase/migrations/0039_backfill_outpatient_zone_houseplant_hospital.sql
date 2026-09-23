-- HIL-133: backfill all outpatient plants to "Houseplant Hospital" zone
-- Requires the Settings outpatient zone label to exist first (exact match, case-insensitive).

do $$
declare
  target_zone_id uuid;
  updated_count integer;
begin
  select id
  into target_zone_id
  from public.outpatient_zone_options
  where lower(trim(label)) = lower(trim('Houseplant Hospital'))
  order by active desc, sort_order, label
  limit 1;

  if target_zone_id is null then
    raise exception
      'HIL-133 backfill aborted: no outpatient_zone_options row with label ''Houseplant Hospital''. Create that zone in Settings (active), then re-run this migration.';
  end if;

  update public.plants
  set outpatient_zone_id = target_zone_id
  where status = 'outpatient';

  get diagnostics updated_count = row_count;

  raise notice
    'HIL-133: set outpatient_zone_id to Houseplant Hospital (%) for % outpatient plant(s).',
    target_zone_id,
    updated_count;
end $$;
