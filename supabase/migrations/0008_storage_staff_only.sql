-- Code review: plant-photos bucket limited to staff profiles (not any Auth user)

drop policy if exists "plant_photos_select_authenticated" on storage.objects;
create policy "plant_photos_select_staff"
on storage.objects
for select
to authenticated
using (bucket_id = 'plant-photos' and public.is_staff());

drop policy if exists "plant_photos_insert_authenticated" on storage.objects;
create policy "plant_photos_insert_staff"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'plant-photos' and public.is_staff());

drop policy if exists "plant_photos_update_authenticated" on storage.objects;
create policy "plant_photos_update_staff"
on storage.objects
for update
to authenticated
using (bucket_id = 'plant-photos' and public.is_staff())
with check (bucket_id = 'plant-photos' and public.is_staff());

drop policy if exists "plant_photos_delete_authenticated" on storage.objects;
create policy "plant_photos_delete_staff"
on storage.objects
for delete
to authenticated
using (bucket_id = 'plant-photos' and public.is_staff());

