-- HIL-52: one active base_price row per size (dedupe + prevent repeats)

-- Deactivate duplicate active base_price rows, keeping the most recently updated per size.
with ranked as (
  select
    id,
    row_number() over (
      partition by size
      order by shopify_synced_at desc nulls last, updated_at desc
    ) as rn
  from public.pricing_rules
  where rule_type = 'base_price'
    and active = true
    and size is not null
)
update public.pricing_rules pr
set active = false
from ranked r
where pr.id = r.id
  and r.rn > 1;

create unique index if not exists pricing_rules_one_active_base_price_per_size_idx
on public.pricing_rules (size)
where rule_type = 'base_price' and active = true and size is not null;
