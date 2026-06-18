-- HIL-52: Shopify as source of truth for base + pests (bugs) treatment prices

alter table public.pricing_rules
  add column if not exists shopify_variant_id text,
  add column if not exists shopify_pests_variant_id text,
  add column if not exists pests_amount numeric(10,2),
  add column if not exists shopify_synced_at timestamptz;

-- Standard product: Houseplant Hospital (15770464616829)
-- Pests product: Pests - Houseplant Hospital (15827718668669)
-- Shopify option "Mini" maps to app size XS

update public.pricing_rules set
  shopify_variant_id = '57808365977981',
  shopify_pests_variant_id = '57895455293821'
where rule_type = 'base_price' and size = 'XS' and active = true;

update public.pricing_rules set
  shopify_variant_id = '57724214378877',
  shopify_pests_variant_id = '57895455326589'
where rule_type = 'base_price' and size = 'S' and active = true;

update public.pricing_rules set
  shopify_variant_id = '57724214411645',
  shopify_pests_variant_id = '57895455359357'
where rule_type = 'base_price' and size = 'M' and active = true;

update public.pricing_rules set
  shopify_variant_id = '57724214444413',
  shopify_pests_variant_id = '57895455392125'
where rule_type = 'base_price' and size = 'L' and active = true;

update public.pricing_rules set
  shopify_variant_id = '57724214477181',
  shopify_pests_variant_id = '57895455424893'
where rule_type = 'base_price' and size = 'XL' and active = true;
