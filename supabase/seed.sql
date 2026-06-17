-- Dev seed: pricing_rules (HIL-9 — Hilda pricing Jun 2026)
-- XS £12, S £18, M £25, L £35; bugs +10%. XL: confirm with Hilda.

insert into public.pricing_rules (size, rule_type, amount, percent, active)
values
  ('XS', 'base_price', 12.00, 0, true),
  ('S',  'base_price', 18.00, 0, true),
  ('M',  'base_price', 25.00, 0, true),
  ('L',  'base_price', 35.00, 0, true),
  ('XL', 'base_price', 35.00, 0, true),
  (null, 'bugs_surcharge', 0, 10, true);
