-- Houseplant Hospital 2.0 - storage bucket (Phase 1)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'plant-photos',
  'plant-photos',
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Staff (authenticated) can read/write objects in plant-photos
drop policy if exists "plant_photos_select_authenticated" on storage.objects;
create policy "plant_photos_select_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'plant-photos');

drop policy if exists "plant_photos_insert_authenticated" on storage.objects;
create policy "plant_photos_insert_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'plant-photos');

drop policy if exists "plant_photos_update_authenticated" on storage.objects;
create policy "plant_photos_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'plant-photos')
with check (bucket_id = 'plant-photos');

drop policy if exists "plant_photos_delete_authenticated" on storage.objects;
create policy "plant_photos_delete_authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'plant-photos');
