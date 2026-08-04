-- HIL-107: pest treatment option catalog + lock-in label on plant treatments

create table if not exists public.pest_treatment_options (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pest_treatment_options_label_nonempty check (char_length(trim(label)) > 0)
);

create unique index if not exists pest_treatment_options_label_unique_idx
  on public.pest_treatment_options (lower(trim(label)));

create index if not exists pest_treatment_options_sort_idx
  on public.pest_treatment_options (sort_order, label);

create index if not exists pest_treatment_options_active_idx
  on public.pest_treatment_options (active)
  where active = true;

drop trigger if exists pest_treatment_options_set_updated_at on public.pest_treatment_options;
create trigger pest_treatment_options_set_updated_at
before update on public.pest_treatment_options
for each row execute function public.set_updated_at();

alter table public.pest_treatment_options enable row level security;

drop policy if exists "pest_treatment_options_select_staff" on public.pest_treatment_options;
create policy "pest_treatment_options_select_staff"
on public.pest_treatment_options
for select
to authenticated
using (public.is_staff() and (active = true or public.is_admin()));

drop policy if exists "pest_treatment_options_write_admin" on public.pest_treatment_options;
create policy "pest_treatment_options_write_admin"
on public.pest_treatment_options
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.plant_pest_treatments
  add column if not exists option_id uuid references public.pest_treatment_options(id) on delete set null,
  add column if not exists option_label text;

-- Backfill legacy checkbox-only rows with a readable locked label
update public.plant_pest_treatments
set option_label = coalesce(nullif(trim(option_label), ''), 'Treatment recorded')
where option_label is null or trim(option_label) = '';

insert into public.pest_treatment_options (label, sort_order)
select * from (
  values
    ('SB spray', 10),
    ('Horticultural Soap spray', 20),
    ('Horticultural soap bath', 30),
    ('Physical removal', 40),
    ('Predator mites', 50),
    ('Nematodes', 60)
) as seed(label, sort_order)
where not exists (
  select 1
  from public.pest_treatment_options existing
  where lower(trim(existing.label)) = lower(trim(seed.label))
);
