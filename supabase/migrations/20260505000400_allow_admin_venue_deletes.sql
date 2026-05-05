-- Allow active admins to permanently delete venue records.

drop policy if exists "Admins can delete venues" on public.venues;
create policy "Admins can delete venues"
  on public.venues
  for delete
  using (public.is_admin());

grant delete on public.venues to authenticated;
