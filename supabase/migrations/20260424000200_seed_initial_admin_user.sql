-- Seed the initial owner admin account.
--
-- This migration creates or updates the Supabase Auth user for the admin
-- login, ensures the email identity exists, then promotes the user in
-- public.admin_users.
--
-- Security note: this stores an initial password in migration history.
-- Rotate the password after first login.

create extension if not exists pgcrypto;

do $$
declare
  v_admin_email constant text := 'admin@gmail.com';
  v_admin_password constant text := 'QWEqwe123@';
  v_admin_id uuid;
  v_identity_data jsonb;
  v_has_provider_id boolean;
begin
  select u.id
    into v_admin_id
    from auth.users u
   where lower(u.email) = lower(v_admin_email)
   order by u.created_at
   limit 1;

  if v_admin_id is null then
    v_admin_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      crypt(v_admin_password, gen_salt('bf')),
      timezone('utc', now()),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      jsonb_build_object('full_name', 'Admin'),
      timezone('utc', now()),
      timezone('utc', now())
    );
  else
    update auth.users
       set encrypted_password = crypt(v_admin_password, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
           raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
             || jsonb_build_object('provider', 'email', 'providers', array['email']),
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
             || jsonb_build_object('full_name', 'Admin'),
           updated_at = timezone('utc', now())
     where id = v_admin_id;
  end if;

  v_identity_data := jsonb_build_object(
    'sub', v_admin_id::text,
    'email', v_admin_email,
    'email_verified', true
  );

  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'identities'
       and column_name = 'provider_id'
  )
    into v_has_provider_id;

  if v_has_provider_id then
    execute
      'insert into auth.identities (
         provider_id,
         user_id,
         identity_data,
         provider,
         last_sign_in_at,
         created_at,
         updated_at
       )
       values ($1, $2, $3, $4, timezone(''utc'', now()), timezone(''utc'', now()), timezone(''utc'', now()))
       on conflict do nothing'
    using v_admin_id::text, v_admin_id, v_identity_data, 'email';
  else
    execute
      'insert into auth.identities (
         id,
         user_id,
         identity_data,
         provider,
         last_sign_in_at,
         created_at,
         updated_at
       )
       values ($1, $2, $3, $4, timezone(''utc'', now()), timezone(''utc'', now()), timezone(''utc'', now()))
       on conflict do nothing'
    using v_admin_id::text, v_admin_id, v_identity_data, 'email';
  end if;

  insert into public.admin_users (
    user_id,
    role,
    display_name,
    is_active
  )
  values (
    v_admin_id,
    'owner',
    'Admin',
    true
  )
  on conflict (user_id) do update set
    role = excluded.role,
    display_name = excluded.display_name,
    is_active = true,
    updated_at = timezone('utc', now());
end;
$$;
