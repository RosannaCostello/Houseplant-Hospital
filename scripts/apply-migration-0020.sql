-- HIL-104: quarantine pest treatments + sticky bugs_found_ever

alter table public.plants
  add column if not exists bugs_found_ever boolean not null default false;

update public.plants
set bugs_found_ever = true
where bugs_found = true
  and bugs_found_ever = false;

comment on column public.plants.bugs_found_ever is
  'Sticky true once pests were ever found; never cleared when bugs_found is reset.';

create table if not exists public.plant_pest_treatments (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  treatment_number smallint not null check (treatment_number in (1, 2, 3)),
  treated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plant_id, treatment_number)
);

create index if not exists plant_pest_treatments_plant_id_idx
  on public.plant_pest_treatments (plant_id);

drop trigger if exists plant_pest_treatments_set_updated_at on public.plant_pest_treatments;
create trigger plant_pest_treatments_set_updated_at
before update on public.plant_pest_treatments
for each row execute function public.set_updated_at();

alter table public.plant_pest_treatments enable row level security;

drop policy if exists "plant_pest_treatments_rw_staff" on public.plant_pest_treatments;
create policy "plant_pest_treatments_rw_staff"
on public.plant_pest_treatments
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());
