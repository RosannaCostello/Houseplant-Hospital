-- HIL-43: ensure bugs_surcharge rule exists (seed may not have been run on hh-dev)
insert into public.pricing_rules (size, rule_type, amount, percent, active)
select null, 'bugs_surcharge', 0, 10, true
where not exists (
  select 1
  from public.pricing_rules
  where rule_type = 'bugs_surcharge'
    and active = true
);
