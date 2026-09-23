-- Per-plant pot size consent (add column if missing; default unchecked / opt-in).

alter table public.plants
  add column if not exists pot_size_change_consent boolean not null default false;

alter table public.plants
  alter column pot_size_change_consent set default false;

comment on column public.plants.pot_size_change_consent is
  'Customer consent to repot this plant if needed (captured per plant at check-in).';
