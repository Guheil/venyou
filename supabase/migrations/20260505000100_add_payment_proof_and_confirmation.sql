-- Add payment proof URL and admin payment confirmation type to venue_reservations

alter table public.venue_reservations
  add column if not exists payment_proof_url text,
  add column if not exists admin_payment_type text
    check (admin_payment_type in ('online', 'face_to_face'));

-- Storage bucket for payment proof screenshots/receipts
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Users can upload their own payment proofs
drop policy if exists "Users can upload own payment proofs" on storage.objects;
create policy "Users can upload own payment proofs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own payment proofs
drop policy if exists "Users can read own payment proofs" on storage.objects;
create policy "Users can read own payment proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read all payment proofs
drop policy if exists "Admins can read all payment proofs" on storage.objects;
create policy "Admins can read all payment proofs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and public.is_admin()
  );

-- Admins can update admin_payment_type on reservations
drop policy if exists "Admins can update reservation payment type" on public.venue_reservations;
create policy "Admins can update reservation payment type"
  on public.venue_reservations
  for update
  using (public.is_admin())
  with check (public.is_admin());
