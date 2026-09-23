-- HIL-131: outpatient zones, pest types, allow treatments beyond 1–3

-- ---------- Outpatient zone options ----------

create table if not exists public.outpatient_zone_options (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outpatient_zone_options_label_nonempty check (char_length(trim(label)) > 0)
);

create unique index if not exists outpatient_zone_options_label_unique_idx
  on public.outpatient_zone_options (lower(trim(label)));

create index if not exists outpatient_zone_options_sort_idx
  on public.outpatient_zone_options (sort_order, label);

create index if not exists outpatient_zone_options_active_idx
  on public.outpatient_zone_options (active)
  where active = true;

drop trigger if exists outpatient_zone_options_set_updated_at on public.outpatient_zone_options;
create trigger outpatient_zone_options_set_updated_at
before update on public.outpatient_zone_options
for each row execute function public.set_updated_at();

alter table public.outpatient_zone_options enable row level security;

drop policy if exists "outpatient_zone_options_select_staff" on public.outpatient_zone_options;
create policy "outpatient_zone_options_select_staff"
on public.outpatient_zone_options
for select
to authenticated
using (public.is_staff() and (active = true or public.is_admin()));

drop policy if exists "outpatient_zone_options_write_admin" on public.outpatient_zone_options;
create policy "outpatient_zone_options_write_admin"
on public.outpatient_zone_options
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.outpatient_zone_options (label, sort_order)
select * from (
  values
    ('Office', 10),
    ('Quarantine', 20)
) as seed(label, sort_order)
where not exists (
  select 1
  from public.outpatient_zone_options existing
  where lower(trim(existing.label)) = lower(trim(seed.label))
);

alter table public.plants
  add column if not exists outpatient_zone_id uuid references public.outpatient_zone_options(id) on delete set null;

create index if not exists plants_outpatient_zone_id_idx
  on public.plants (outpatient_zone_id)
  where outpatient_zone_id is not null;

-- ---------- Pest type options ----------

create table if not exists public.pest_type_options (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  paragraph text not null default '',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pest_type_options_label_nonempty check (char_length(trim(label)) > 0)
);

create unique index if not exists pest_type_options_label_unique_idx
  on public.pest_type_options (lower(trim(label)));

create index if not exists pest_type_options_sort_idx
  on public.pest_type_options (sort_order, label);

create index if not exists pest_type_options_active_idx
  on public.pest_type_options (active)
  where active = true;

drop trigger if exists pest_type_options_set_updated_at on public.pest_type_options;
create trigger pest_type_options_set_updated_at
before update on public.pest_type_options
for each row execute function public.set_updated_at();

alter table public.pest_type_options enable row level security;

drop policy if exists "pest_type_options_select_staff" on public.pest_type_options;
create policy "pest_type_options_select_staff"
on public.pest_type_options
for select
to authenticated
using (public.is_staff() and (active = true or public.is_admin()));

drop policy if exists "pest_type_options_write_admin" on public.pest_type_options;
create policy "pest_type_options_write_admin"
on public.pest_type_options
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.pest_type_options (label, paragraph, sort_order)
select * from (
  values
    (
      'Fungus gnats',
      'Fungus gnats were found on this plant. We’ve treated for them; keep the top of the compost drier and avoid overwatering at home.',
      10
    ),
    (
      'Thrips',
      'Thrips were found on this plant. We’ve treated for them; isolate from other plants at home and wipe leaves regularly while recovering.',
      20
    ),
    (
      'Mealybugs',
      'Mealybugs were found on this plant. We’ve treated for them; check leaf joints and wipe any remaining residue carefully.',
      30
    ),
    (
      'Spider mites',
      'Spider mites were found on this plant. We’ve treated for them; increase humidity gently and keep an eye on undersides of leaves.',
      40
    )
) as seed(label, paragraph, sort_order)
where not exists (
  select 1
  from public.pest_type_options existing
  where lower(trim(existing.label)) = lower(trim(seed.label))
);

alter table public.plants
  add column if not exists pest_type_option_id uuid references public.pest_type_options(id) on delete set null;

create index if not exists plants_pest_type_option_id_idx
  on public.plants (pest_type_option_id)
  where pest_type_option_id is not null;

-- ---------- Pest treatments: allow more than 3 ----------

alter table public.plant_pest_treatments
  drop constraint if exists plant_pest_treatments_treatment_number_check;

alter table public.plant_pest_treatments
  add constraint plant_pest_treatments_treatment_number_check
  check (treatment_number >= 1);
