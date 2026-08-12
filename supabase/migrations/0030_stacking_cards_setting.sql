-- HIL-114: dashboard stacking cards toggle (admin Settings).

alter table public.app_copy_settings
  add column if not exists stacking_cards_enabled boolean not null default true;

comment on column public.app_copy_settings.stacking_cards_enabled is
  'When true, sibling plants in the same dashboard lane stack as a swipeable fan.';
