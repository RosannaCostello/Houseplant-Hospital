-- HIL-83: track print bridge delivery attempts on print_jobs outbox
alter table public.print_jobs
  add column if not exists sent_at timestamptz,
  add column if not exists last_error text,
  add column if not exists attempts integer not null default 0;

comment on column public.print_jobs.status is 'pending = not delivered to bridge; sent = bridge accepted; failed = permanent failure';
comment on column public.print_jobs.attempts is 'Number of delivery attempts to PRINT_BRIDGE_URL';
