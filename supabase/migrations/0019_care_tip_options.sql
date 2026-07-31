-- HIL-102: structured care tip options + editable treatment-notes placeholder

create table if not exists public.care_tip_options (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('water', 'leaves', 'light')),
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists care_tip_options_category_sort_idx
  on public.care_tip_options (category, sort_order, label);

create index if not exists care_tip_options_active_idx
  on public.care_tip_options (active)
  where active = true;

drop trigger if exists care_tip_options_set_updated_at on public.care_tip_options;
create trigger care_tip_options_set_updated_at
before update on public.care_tip_options
for each row execute function public.set_updated_at();

alter table public.care_tip_options enable row level security;

drop policy if exists "care_tip_options_select_staff" on public.care_tip_options;
create policy "care_tip_options_select_staff"
on public.care_tip_options
for select
to authenticated
using (public.is_staff() and (active = true or public.is_admin()));

drop policy if exists "care_tip_options_write_admin" on public.care_tip_options;
create policy "care_tip_options_write_admin"
on public.care_tip_options
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.app_copy_settings (
  id int primary key default 1 check (id = 1),
  treatment_notes_placeholder text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_copy_settings_set_updated_at on public.app_copy_settings;
create trigger app_copy_settings_set_updated_at
before update on public.app_copy_settings
for each row execute function public.set_updated_at();

alter table public.app_copy_settings enable row level security;

drop policy if exists "app_copy_settings_select_staff" on public.app_copy_settings;
create policy "app_copy_settings_select_staff"
on public.app_copy_settings
for select
to authenticated
using (public.is_staff());

drop policy if exists "app_copy_settings_write_admin" on public.app_copy_settings;
create policy "app_copy_settings_write_admin"
on public.app_copy_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.app_copy_settings (id, treatment_notes_placeholder)
values (
  1,
  'State condition of plant if relevant and then list treatment. Insert bug paragraph if necessary.'
)
on conflict (id) do nothing;

insert into public.care_tip_options (category, label, sort_order)
select * from (
  values
    ('water', 'Water when the soil has dried out using the drench, drain and dry method', 10),
    ('water', 'don''t water ever', 20),
    ('leaves', 'Try to keep the leaves dust free', 10),
    ('leaves', 'mist the leaves', 20),
    ('light', 'Give the plant plenty of light', 10),
    ('light', 'keep away from light', 20)
) as seed(category, label, sort_order)
where not exists (
  select 1
  from public.care_tip_options existing
  where existing.category = seed.category
    and existing.label = seed.label
);
