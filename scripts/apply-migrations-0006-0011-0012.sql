-- Apply pending migrations (0006, 0011, 0012) in Supabase SQL editor.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards where possible.

-- 0006_plant_collection_hil49.sql
alter table public.plants
  add column if not exists final_price numeric(10,2),
  add column if not exists collected_at timestamptz;

create index if not exists plants_collected_at_idx on public.plants (collected_at desc);

-- 0011_bugs_found_nullable.sql
alter table plants
  alter column bugs_found drop not null,
  alter column bugs_found drop default;

alter table plants
  alter column bugs_found set default null;

update plants
set bugs_found = null
where bugs_found = false;

-- 0012_single_plant_notes.sql
delete from public.treatment_notes older
using public.treatment_notes newer
where older.plant_id = newer.plant_id
  and older.created_at < newer.created_at;

delete from public.care_tips older
using public.care_tips newer
where older.plant_id = newer.plant_id
  and older.created_at < newer.created_at;

alter table public.treatment_notes
  add column if not exists updated_at timestamptz;

update public.treatment_notes
set updated_at = created_at
where updated_at is null;

alter table public.treatment_notes
  alter column updated_at set default now();

alter table public.care_tips
  add column if not exists updated_at timestamptz;

update public.care_tips
set updated_at = created_at
where updated_at is null;

alter table public.care_tips
  alter column updated_at set default now();

create unique index if not exists treatment_notes_plant_id_unique
  on public.treatment_notes (plant_id);

create unique index if not exists care_tips_plant_id_unique
  on public.care_tips (plant_id);
