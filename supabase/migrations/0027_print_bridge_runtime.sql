-- Runtime print-bridge base URL (updated by Mini tunnel LaunchAgent on each start).
-- Allows trycloudflare.com URLs to change after reboot without redeploying the Worker.
create table if not exists public.print_bridge_runtime (
  id integer primary key default 1 check (id = 1),
  base_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.print_bridge_runtime enable row level security;

drop policy if exists "print_bridge_runtime_admin" on public.print_bridge_runtime;
create policy "print_bridge_runtime_admin"
on public.print_bridge_runtime
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on table public.print_bridge_runtime is 'Single-row: current public URL of Mac Mini print-bridge tunnel (HIL-85)';
