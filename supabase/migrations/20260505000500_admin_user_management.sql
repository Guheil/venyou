-- Admin user management over Supabase Auth users.

drop function if exists public.get_admin_user_accounts();
create or replace function public.get_admin_user_accounts()
returns table (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  updated_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  is_disabled boolean,c
  providers text[],
  admin_role text,
  admin_is_active boolean,
  event_count integer,
  reservation_count integer,
  confirmed_reservation_count integer
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
    u.id as user_id,
    u.email::text,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      nullif(u.raw_user_meta_data ->> 'preferred_username', ''),
      u.email,
      'User'
    )::text as display_name,
    u.created_at,
    u.updated_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.banned_until,
    (
      u.banned_until is not null
      and u.banned_until > timezone('utc', now())
    ) as is_disabled,
    coalesce(
      array(
        select jsonb_array_elements_text(
          case
            when jsonb_typeof(u.raw_app_meta_data -> 'providers') = 'array'
              then u.raw_app_meta_data -> 'providers'
            when u.raw_app_meta_data ? 'provider'
              then jsonb_build_array(u.raw_app_meta_data ->> 'provider')
            else '[]'::jsonb
          end
        )
      ),
      array[]::text[]
    ) as providers,
    au.role as admin_role,
    coalesce(au.is_active, false) as admin_is_active,
    coalesce(ec.event_count, 0)::integer as event_count,
    coalesce(rc.reservation_count, 0)::integer as reservation_count,
    coalesce(rc.confirmed_reservation_count, 0)::integer as confirmed_reservation_count
  from auth.users u
  left join public.admin_users au on au.user_id = u.id
  left join (
    select e.user_id, count(*)::integer as event_count
    from public.events e
    group by e.user_id
  ) ec on ec.user_id = u.id
  left join (
    select
      vr.user_id,
      count(*)::integer as reservation_count,
      count(*) filter (where vr.reservation_status = 'confirmed')::integer as confirmed_reservation_count
    from public.venue_reservations vr
    group by vr.user_id
  ) rc on rc.user_id = u.id
  order by u.created_at desc;
end;
$$;

drop function if exists public.admin_disable_user_account(uuid);
create or replace function public.admin_disable_user_account(p_user_id uuid)
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

  if p_user_id = auth.uid() then
    raise exception 'SELF_DISABLE_FORBIDDEN' using errcode = '42501';
  end if;

  update auth.users
     set banned_until = timezone('utc', now()) + interval '100 years',
         updated_at = timezone('utc', now())
   where id = p_user_id;

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
      'disable_user',
      'auth.users',
      p_user_id,
      '{}'::jsonb
    );
  end if;

  return v_count > 0;
end;
$$;

drop function if exists public.admin_enable_user_account(uuid);
create or replace function public.admin_enable_user_account(p_user_id uuid)
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

  update auth.users
     set banned_until = null,
         updated_at = timezone('utc', now())
   where id = p_user_id;

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
      'enable_user',
      'auth.users',
      p_user_id,
      '{}'::jsonb
    );
  end if;

  return v_count > 0;
end;
$$;

drop function if exists public.admin_delete_user_account(uuid);
create or replace function public.admin_delete_user_account(p_user_id uuid)
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

  if p_user_id = auth.uid() then
    raise exception 'SELF_DELETE_FORBIDDEN' using errcode = '42501';
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
    'delete_user',
    'auth.users',
    p_user_id,
    '{}'::jsonb
  );

  delete from auth.users
   where id = p_user_id;

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function public.get_admin_user_accounts() to authenticated;
grant execute on function public.admin_disable_user_account(uuid) to authenticated;
grant execute on function public.admin_enable_user_account(uuid) to authenticated;
grant execute on function public.admin_delete_user_account(uuid) to authenticated;

revoke all on function public.get_admin_user_accounts() from public, anon;
revoke all on function public.admin_disable_user_account(uuid) from public, anon;
revoke all on function public.admin_enable_user_account(uuid) from public, anon;
revoke all on function public.admin_delete_user_account(uuid) from public, anon;
