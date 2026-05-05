-- Align reservation requests with the admin-confirmed event lifecycle.

drop policy if exists "Users can update own payment proofs" on storage.objects;
create policy "Users can update own payment proofs"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.venue_reservations
     set reservation_status = 'cancelled',
         payment_status     = 'failed'
   where reservation_status = 'pending_payment'
     and expires_at is not null
     and expires_at < now()
     and payment_reference is null
     and payment_proof_url is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

drop function if exists public.admin_confirm_reservation_payment(uuid, text, text);
create or replace function public.admin_confirm_reservation_payment(
  p_reservation_id uuid,
  p_payment_reference text default null,
  p_admin_note text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_event_id uuid;
  v_venue_id uuid;
  v_payment_method text;
  v_existing_reference text;
  v_reference text;
  v_admin_payment_type text;
  v_venue_name text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select
    vr.event_id,
    vr.venue_id,
    vr.payment_method,
    vr.payment_reference,
    v.name
  into
    v_event_id,
    v_venue_id,
    v_payment_method,
    v_existing_reference,
    v_venue_name
  from public.venue_reservations vr
  left join public.venues v on v.id = vr.venue_id
  where vr.id = p_reservation_id;

  if not found then
    return false;
  end if;

  v_reference := nullif(trim(coalesce(p_payment_reference, '')), '');
  if v_reference is null then
    v_reference := nullif(trim(coalesce(v_existing_reference, '')), '');
  end if;
  if v_reference is null then
    v_reference := 'ADMIN-' || upper(replace(substring(gen_random_uuid()::text from 1 for 9), '-', ''));
  end if;

  v_admin_payment_type := case
    when v_payment_method = 'gcash' then 'online'
    else 'face_to_face'
  end;

  update public.venue_reservations
     set payment_status = 'paid',
         reservation_status = 'confirmed',
         payment_reference = v_reference,
         payment_confirmed_at = timezone('utc', now()),
         payment_confirmed_by = auth.uid(),
         admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note),
         admin_payment_type = v_admin_payment_type,
         expires_at = null
   where id = p_reservation_id
     and reservation_status <> 'cancelled'
     and payment_status <> 'paid';

  get diagnostics v_count = row_count;

  if v_count > 0 then
    if v_event_id is not null then
      update public.events
         set status = 'Confirmed',
             top_venue_id = v_venue_id::text,
             top_venue_name = coalesce(v_venue_name, top_venue_name),
             venue_count = greatest(venue_count, 1)
       where id = v_event_id;
    end if;

    insert into public.admin_action_logs (
      admin_user_id,
      action,
      target_table,
      target_id,
      metadata
    )
    values (
      auth.uid(),
      'confirm_payment',
      'venue_reservations',
      p_reservation_id,
      jsonb_build_object(
        'payment_reference', v_reference,
        'payment_method', v_payment_method,
        'admin_payment_type', v_admin_payment_type,
        'event_id', v_event_id,
        'venue_id', v_venue_id
      )
    );
  end if;

  return v_count > 0;
end;
$$;

grant execute on function public.release_expired_reservations() to authenticated;
grant execute on function public.admin_confirm_reservation_payment(uuid, text, text) to authenticated;

revoke all on function public.release_expired_reservations() from public, anon;
revoke all on function public.admin_confirm_reservation_payment(uuid, text, text) from public, anon;
