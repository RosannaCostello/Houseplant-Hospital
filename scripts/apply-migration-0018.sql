-- Apply in Supabase SQL editor (HIL-94)

alter table public.check_in_drafts
  add column if not exists acuity_appointment_id text;

create unique index if not exists check_in_drafts_acuity_appointment_id_uidx
  on public.check_in_drafts (acuity_appointment_id)
  where acuity_appointment_id is not null;

comment on column public.check_in_drafts.acuity_appointment_id is
  'Acuity appointment id when this draft was created from a booking webhook.';
