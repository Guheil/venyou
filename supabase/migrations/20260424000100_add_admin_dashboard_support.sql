-- Admin dashboard support for reservation review, payment confirmation,
-- venue management, analytics, and audit logging.
--
-- To promote the first admin after running this migration, execute:
-- insert into public.admin_users (user_id, role, display_name)
-- values ('<auth-user-id>', 'owner', 'Admin');

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  role text not null default 'manager' check (role in ('owner', 'manager', 'finance')),
  display_name text not null default '',
  is_active boolean not null default true
);

create or replace function public.set_admin_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row execute function public.set_admin_users_updated_at();

alter table public.admin_users enable row level security;
alter table public.admin_users force row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
  );
$$;

create or replace function public.admin_role()
returns text
language sql
security definer
set search_path = public
as $$
  select au.role
  from public.admin_users au
  where au.user_id = auth.uid()
    and au.is_active = true
  limit 1;
$$;

create or replace function public.current_admin_profile()
returns table (
  user_id uuid,
  role text,
  display_name text,
  is_active boolean
)
language sql
security definer
set search_path = public
as $$
  select au.user_id, au.role, au.display_name, au.is_active
  from public.admin_users au
  where au.user_id = auth.uid()
    and au.is_active = true
  limit 1;
$$;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
  on public.admin_users
  for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Owners can manage admin users" on public.admin_users;
create policy "Owners can manage admin users"
  on public.admin_users
  for all
  using (public.admin_role() = 'owner')
  with check (public.admin_role() = 'owner');

revoke all on public.admin_users from public;
revoke all on public.admin_users from anon;
revoke all on public.admin_users from authenticated;
grant select, insert, update, delete on public.admin_users to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_role() to authenticated;
grant execute on function public.current_admin_profile() to authenticated;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.admin_role() from public, anon;
revoke all on function public.current_admin_profile() from public, anon;

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  admin_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists admin_action_logs_created_at_idx
  on public.admin_action_logs (created_at desc);

create index if not exists admin_action_logs_target_idx
  on public.admin_action_logs (target_table, target_id, created_at desc);

alter table public.admin_action_logs enable row level security;
alter table public.admin_action_logs force row level security;

drop policy if exists "Admins can read action logs" on public.admin_action_logs;
create policy "Admins can read action logs"
  on public.admin_action_logs
  for select
  using (public.is_admin());

drop policy if exists "Admins can insert action logs" on public.admin_action_logs;
create policy "Admins can insert action logs"
  on public.admin_action_logs
  for insert
  with check (public.is_admin() and admin_user_id = auth.uid());

revoke all on public.admin_action_logs from public;
revoke all on public.admin_action_logs from anon;
revoke all on public.admin_action_logs from authenticated;
grant select, insert on public.admin_action_logs to authenticated;

alter table public.venue_reservations
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists payment_confirmed_by uuid references auth.users (id) on delete set null,
  add column if not exists admin_note text not null default '';

create index if not exists venue_reservations_admin_queue_idx
  on public.venue_reservations (reservation_status, payment_status, created_at desc);

create index if not exists venue_reservations_event_date_idx
  on public.venue_reservations (event_date);

drop policy if exists "Admins can read all events" on public.events;
create policy "Admins can read all events"
  on public.events
  for select
  using (public.is_admin());

drop policy if exists "Admins can read all venues" on public.venues;
create policy "Admins can read all venues"
  on public.venues
  for select
  using (public.is_admin());

drop policy if exists "Admins can insert venues" on public.venues;
create policy "Admins can insert venues"
  on public.venues
  for insert
  with check (public.is_admin());

drop policy if exists "Admins can update venues" on public.venues;
create policy "Admins can update venues"
  on public.venues
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read all reservations" on public.venue_reservations;
create policy "Admins can read all reservations"
  on public.venue_reservations
  for select
  using (public.is_admin());

drop policy if exists "Admins can update reservations" on public.venue_reservations;
create policy "Admins can update reservations"
  on public.venue_reservations
  for update
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.venues to authenticated;

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
  v_reference text;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_reference := nullif(trim(coalesce(p_payment_reference, '')), '');
  if v_reference is null then
    v_reference := 'ADMIN-' || upper(replace(substring(gen_random_uuid()::text from 1 for 9), '-', ''));
  end if;

  update public.venue_reservations
     set payment_status = 'paid',
         reservation_status = 'confirmed',
         payment_reference = v_reference,
         payment_confirmed_at = timezone('utc', now()),
         payment_confirmed_by = auth.uid(),
         admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note),
         expires_at = null
   where id = p_reservation_id
     and reservation_status <> 'cancelled'
     and payment_status <> 'paid';

  get diagnostics v_count = row_count;

  if v_count > 0 then
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
      jsonb_build_object('payment_reference', v_reference)
    );
  end if;

  return v_count > 0;
end;
$$;

drop function if exists public.admin_cancel_reservation(uuid, text);
create or replace function public.admin_cancel_reservation(
  p_reservation_id uuid,
  p_admin_note text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  update public.venue_reservations
     set reservation_status = 'cancelled',
         payment_status = case
                            when payment_status = 'paid' then 'refunded'
                            else 'failed'
                          end,
         admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note),
         expires_at = null
   where id = p_reservation_id
     and reservation_status <> 'cancelled';

  get diagnostics v_count = row_count;

  if v_count > 0 then
    insert into public.admin_action_logs (
      admin_user_id,
      action,
      target_table,
      target_id,
      metadata
    )
    values (
      auth.uid(),
      'cancel_reservation',
      'venue_reservations',
      p_reservation_id,
      jsonb_build_object('admin_note', p_admin_note)
    );
  end if;

  return v_count > 0;
end;
$$;

drop function if exists public.get_admin_dashboard_summary();
create or replace function public.get_admin_dashboard_summary()
returns table (
  pending_requests integer,
  confirmed_reservations integer,
  cancelled_reservations integer,
  total_reserved_value bigint,
  pending_value bigint,
  active_venues integer,
  inactive_venues integer,
  upcoming_reservations integer,
  cash_pending integer,
  gcash_pending integer,
  total_events integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  with reservation_stats as (
    select
      count(*) filter (
        where reservation_status = 'pending_payment'
          and payment_status = 'pending'
      )::integer as pending_requests,
      count(*) filter (where reservation_status = 'confirmed')::integer as confirmed_reservations,
      count(*) filter (where reservation_status = 'cancelled')::integer as cancelled_reservations,
      coalesce(sum(total_amount) filter (where reservation_status <> 'cancelled'), 0)::bigint as total_reserved_value,
      coalesce(sum(total_amount) filter (
        where reservation_status = 'pending_payment'
          and payment_status = 'pending'
      ), 0)::bigint as pending_value,
      count(*) filter (
        where reservation_status <> 'cancelled'
          and event_date >= current_date
      )::integer as upcoming_reservations,
      count(*) filter (
        where reservation_status = 'pending_payment'
          and payment_status = 'pending'
          and payment_method = 'cash'
      )::integer as cash_pending,
      count(*) filter (
        where reservation_status = 'pending_payment'
          and payment_status = 'pending'
          and payment_method = 'gcash'
      )::integer as gcash_pending
    from public.venue_reservations
  ),
  venue_stats as (
    select
      count(*) filter (where is_active = true)::integer as active_venues,
      count(*) filter (where is_active = false)::integer as inactive_venues
    from public.venues
  ),
  event_stats as (
    select count(*)::integer as total_events
    from public.events
  )
  select
    reservation_stats.pending_requests,
    reservation_stats.confirmed_reservations,
    reservation_stats.cancelled_reservations,
    reservation_stats.total_reserved_value,
    reservation_stats.pending_value,
    venue_stats.active_venues,
    venue_stats.inactive_venues,
    reservation_stats.upcoming_reservations,
    reservation_stats.cash_pending,
    reservation_stats.gcash_pending,
    event_stats.total_events
  from reservation_stats
  cross join venue_stats
  cross join event_stats;
end;
$$;

drop function if exists public.get_admin_events();
create or replace function public.get_admin_events()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  creator_full_name text,
  event_name text,
  occasion text,
  description text,
  pax integer,
  budget_min integer,
  budget_max integer,
  budget_type text,
  city text,
  area text,
  radius_km integer,
  setting text,
  event_date text,
  start_time text,
  duration_hours integer,
  amenities text[],
  catering text,
  tone_keywords text,
  extra_notes text,
  status text,
  venue_count integer,
  top_venue_id text,
  top_venue_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  return query
  select
    e.id,
    e.created_at,
    e.updated_at,
    e.user_id,
    coalesce(
      u.raw_user_meta_data ->> 'full_name',
      u.raw_user_meta_data ->> 'name',
      u.raw_user_meta_data ->> 'preferred_username',
      ''
    ) as creator_full_name,
    e.event_name,
    e.occasion,
    e.description,
    e.pax,
    e.budget_min,
    e.budget_max,
    e.budget_type,
    e.city,
    e.area,
    e.radius_km,
    e.setting,
    e.event_date,
    e.start_time,
    e.duration_hours,
    e.amenities,
    e.catering,
    e.tone_keywords,
    e.extra_notes,
    e.status,
    e.venue_count,
    e.top_venue_id,
    e.top_venue_name
  from public.events e
  left join auth.users u on u.id = e.user_id
  order by e.created_at desc;
end;
$$;

grant execute on function public.get_admin_events() to authenticated;
revoke all on function public.get_admin_events() from public, anon;

grant execute on function public.admin_confirm_reservation_payment(uuid, text, text) to authenticated;
grant execute on function public.admin_cancel_reservation(uuid, text) to authenticated;
grant execute on function public.get_admin_dashboard_summary() to authenticated;

revoke all on function public.admin_confirm_reservation_payment(uuid, text, text) from public, anon;
revoke all on function public.admin_cancel_reservation(uuid, text) from public, anon;
revoke all on function public.get_admin_dashboard_summary() from public, anon;
