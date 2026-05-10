-- ─────────────────────────────────────────────────────────────
-- Migration: Time-based reservation conflict detection
--
-- Previously the system blocked an entire day once any booking
-- existed for a venue+date.  This migration changes the logic so
-- that only overlapping time windows are considered conflicts,
-- allowing multiple bookings on the same date as long as their
-- time ranges do not overlap.
--
-- Changes:
--   1. Drop the partial unique index that enforced one booking
--      per venue per date (regardless of time).
--   2. Replace create_venue_reservation() with a version that
--      performs a proper time-overlap check.
-- ─────────────────────────────────────────────────────────────

-- 1. Remove the date-level uniqueness constraint
drop index if exists public.venue_reservations_no_double_book_idx;

-- 2. Replace the atomic reservation function with time-overlap logic
create or replace function public.create_venue_reservation(
  p_venue_id         uuid,
  p_event_id         uuid,
  p_event_date       date,
  p_start_time       text,      -- "HH:MM" (24-hour)
  p_duration_hours   integer,
  p_guest_count      integer,
  p_price_per_head   integer,
  p_total_amount     integer,
  p_contact_name     text,
  p_contact_phone    text,
  p_special_requests text,
  p_payment_method   text
)
returns table (
  reservation_id   uuid,
  reference_number text,
  conflict         boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id  uuid;
  v_ref          text;
  v_new_id       uuid;
  v_expires_at   timestamptz;
  -- Use a fixed reference date so interval arithmetic never wraps midnight
  v_ref_date     date := '2000-01-01';
  v_new_start    timestamp;
  v_new_end      timestamp;
begin
  -- Reject unauthenticated callers even though we run as security definer
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED'
      using hint = 'You must be logged in to make a reservation.';
  end if;

  -- Lock the venue row for the duration of this transaction so concurrent
  -- calls for the same venue serialize properly.
  perform id
    from public.venues
   where id = p_venue_id
     and is_active = true
     for update;

  if not found then
    raise exception 'VENUE_NOT_FOUND'
      using hint = 'The venue does not exist or is inactive.';
  end if;

  -- Compute the new booking's absolute time window.
  -- Anchoring to a fixed reference date avoids midnight wrap-around
  -- issues that occur when adding intervals to the `time` type.
  v_new_start := (v_ref_date + p_start_time::time)::timestamp;
  v_new_end   := v_new_start + (p_duration_hours || ' hours')::interval;

  -- Check for any active reservation whose time window overlaps with the
  -- requested window.  Two intervals [A,A') and [B,B') overlap when
  --   A < B'  AND  A' > B
  select vr.id
    into v_existing_id
    from public.venue_reservations vr
   where vr.venue_id   = p_venue_id
     and vr.event_date = p_event_date
     and vr.reservation_status <> 'cancelled'
     and (vr.expires_at is null or vr.expires_at > now())
     -- new booking starts before existing booking ends
     and v_new_start < (v_ref_date + vr.start_time::time + (vr.duration_hours || ' hours')::interval)::timestamp
     -- new booking ends after existing booking starts
     and v_new_end   > (v_ref_date + vr.start_time::time)::timestamp
   limit 1;

  if found then
    -- Signal a time-slot conflict to the caller
    return query select null::uuid, ''::text, true;
    return;
  end if;

  -- Generate a short human-readable reference: e.g. VNY-A3F2B1C9
  v_ref := 'VNY-' || upper(replace(substring(gen_random_uuid()::text from 1 for 9), '-', ''));

  -- Pending reservations hold the slot for 30 minutes
  v_expires_at := now() + interval '30 minutes';

  insert into public.venue_reservations (
    user_id,
    venue_id,
    event_id,
    event_date,
    start_time,
    duration_hours,
    guest_count,
    price_per_head,
    total_amount,
    contact_name,
    contact_phone,
    special_requests,
    payment_method,
    payment_status,
    reservation_status,
    reference_number,
    expires_at
  ) values (
    auth.uid(),
    p_venue_id,
    p_event_id,
    p_event_date,
    p_start_time,
    p_duration_hours,
    p_guest_count,
    p_price_per_head,
    p_total_amount,
    p_contact_name,
    p_contact_phone,
    p_special_requests,
    p_payment_method,
    'pending',
    'pending_payment',
    v_ref,
    v_expires_at
  )
  returning id into v_new_id;

  return query select v_new_id, v_ref, false;
end;
$$;

-- Ensure only authenticated users can call this function
grant execute on function public.create_venue_reservation(
  uuid, uuid, date, text, integer, integer, integer, integer,
  text, text, text, text
) to authenticated;

revoke all on function public.create_venue_reservation(
  uuid, uuid, date, text, integer, integer, integer, integer,
  text, text, text, text
) from public, anon;
