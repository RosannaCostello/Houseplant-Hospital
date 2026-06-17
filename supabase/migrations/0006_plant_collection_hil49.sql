-- HIL-49: record final price and collection time on plants
alter table public.plants
  add column if not exists final_price numeric(10,2),
  add column if not exists collected_at timestamptz;

create index if not exists plants_collected_at_idx on public.plants (collected_at desc);
