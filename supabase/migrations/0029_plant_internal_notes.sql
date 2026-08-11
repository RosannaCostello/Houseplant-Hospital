-- Per-plant internal notes from check-in (HIL-113).
-- Previously notes were concatenated onto visits.notes and shown on every plant.

alter table public.plants
  add column if not exists notes text;

comment on column public.plants.notes is
  'Staff internal notes entered at check-in for this plant only.';

-- Single-plant drop-offs: copy visit notes onto the plant (skip import markers).
update public.plants as p
set notes = v.notes
from public.visits as v
where p.visit_id = v.id
  and p.notes is null
  and v.notes is not null
  and btrim(v.notes) <> ''
  and btrim(v.notes) not in ('zoho-import', 'zoho-import-final', 'shopify-import')
  and (
    select count(*)::int
    from public.plants as siblings
    where siblings.visit_id = v.id
  ) = 1;

-- Multi-plant drop-offs: split "Label: note" lines written by buildVisitNotes.
with ranked as (
  select
    p.id as plant_id,
    v.notes as visit_notes,
    coalesce(
      nullif(btrim(p.name), ''),
      nullif(btrim(p.species), ''),
      'Plant ' || row_number() over (partition by p.visit_id order by p.created_at asc)::text
    ) as label
  from public.plants as p
  join public.visits as v on v.id = p.visit_id
  where p.notes is null
    and v.notes is not null
    and btrim(v.notes) <> ''
    and btrim(v.notes) not in ('zoho-import', 'zoho-import-final', 'shopify-import')
    and (
      select count(*)::int
      from public.plants as siblings
      where siblings.visit_id = v.id
    ) > 1
),
extracted as (
  select
    r.plant_id,
    nullif(
      btrim(
        substring(
          line from length(r.label) + 3
        )
      ),
      ''
    ) as plant_notes
  from ranked as r
  cross join lateral unnest(string_to_array(r.visit_notes, E'\n')) as line
  where line like r.label || ': %'
)
update public.plants as p
set notes = e.plant_notes
from extracted as e
where p.id = e.plant_id
  and e.plant_notes is not null
  and p.notes is null;
