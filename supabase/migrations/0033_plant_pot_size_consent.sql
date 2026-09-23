-- Per-plant pot size consent (moved from visit-level to plants at check-in step 2).

alter table public.plants
  add column if not exists pot_size_change_consent boolean not null default true;

comment on column public.plants.pot_size_change_consent is
  'Customer consent to repot this plant if needed (captured per plant at check-in).';
