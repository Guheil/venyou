-- Admin event management and venue image upload support.

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events
  for delete
  using (public.is_admin());

grant update, delete on public.events to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'venue-images',
  'venue-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read venue images" on storage.objects;
create policy "Public can read venue images"
  on storage.objects
  for select
  using (bucket_id = 'venue-images');

drop policy if exists "Admins can upload venue images" on storage.objects;
create policy "Admins can upload venue images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'venue-images'
    and public.is_admin()
  );

drop policy if exists "Admins can update venue images" on storage.objects;
create policy "Admins can update venue images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'venue-images'
    and public.is_admin()
  )
  with check (
    bucket_id = 'venue-images'
    and public.is_admin()
  );

drop policy if exists "Admins can delete venue images" on storage.objects;
create policy "Admins can delete venue images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'venue-images'
    and public.is_admin()
  );
