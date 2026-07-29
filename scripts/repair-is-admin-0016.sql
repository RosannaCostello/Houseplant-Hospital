-- Ensure helper roles exist, then re-apply analytics migration 0016.
-- Paste into Supabase SQL Editor and Run.

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('staff', 'admin')
  );
$$;
