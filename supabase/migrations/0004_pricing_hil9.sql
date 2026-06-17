-- HIL-9: Hilda pricing (Jun 2026)
-- XS £12, S £18, M £25, L £35; bugs +10% (e.g. XS with bugs = £13.20)

update public.pricing_rules
set amount = 12.00, updated_at = now()
where rule_type = 'base_price' and size = 'XS' and active = true;

update public.pricing_rules
set amount = 18.00, updated_at = now()
where rule_type = 'base_price' and size = 'S' and active = true;

update public.pricing_rules
set amount = 25.00, updated_at = now()
where rule_type = 'base_price' and size = 'M' and active = true;

update public.pricing_rules
set amount = 35.00, updated_at = now()
where rule_type = 'base_price' and size = 'L' and active = true;

update public.pricing_rules
set percent = 10, amount = 0, updated_at = now()
where rule_type = 'bugs_surcharge' and active = true;
