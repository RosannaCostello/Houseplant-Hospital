-- 0006_plant_collection_hil49.sql — run in Supabase SQL editor if collected_at is missing

alter table public.plants
  add column if not exists final_price numeric(10,2),
  add column if not exists collected_at timestamptz;

create index if not exists plants_collected_at_idx on public.plants (collected_at desc);
