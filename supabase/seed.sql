-- Dev seed: pricing_rules (update amounts when HIL-9 pricing export is available)

insert into public.pricing_rules (size, rule_type, amount, percent, active)
values
  ('XS', 'base_price', 8.00, 0, true),
  ('S',  'base_price', 12.00, 0, true),
  ('M',  'base_price', 18.00, 0, true),
  ('L',  'base_price', 25.00, 0, true),
  ('XL', 'base_price', 35.00, 0, true),
  (null, 'bugs_surcharge', 0, 10, true);
