-- Repair the initial admin Auth seed so Supabase Auth can sign in with it.
--
-- Some Supabase Auth schemas expect token columns on auth.users to contain
-- empty strings instead of nulls. A null in those columns can make password
-- login fail with "Database error querying schema".

create extension if not exists pgcrypto;

do $$
declare
  v_admin_email constant text := 'admin@gmail.com';
  v_admin_password constant text := 'QWEqwe123@';
  v_admin_id uuid;
  v_identity_data jsonb;
  v_has_provider_id boolean;
  v_identity_id_udt text;
  v_column_name text;
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
       set aud = 'authenticated',
           role = 'authenticated',
           encrypted_password = crypt(v_admin_password, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
           raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
             || jsonb_build_object('provider', 'email', 'providers', array['email']),
           raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
             || jsonb_build_object('full_name', 'Admin'),
           updated_at = timezone('utc', now())
     where id = v_admin_id;
  end if;

  foreach v_column_name in array array[
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ]
  loop
    if exists (
      select 1
        from information_schema.columns
       where table_schema = 'auth'
         and table_name = 'users'
         and column_name = v_column_name
    ) then
      execute format(
        'update auth.users set %I = coalesce(%I, '''') where id = $1',
        v_column_name,
        v_column_name
      )
      using v_admin_id;
    end if;
  end loop;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'users'
       and column_name = 'email_change_confirm_status'
  ) then
    update auth.users
       set email_change_confirm_status = coalesce(email_change_confirm_status, 0)
     where id = v_admin_id;
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'users'
       and column_name = 'is_sso_user'
  ) then
    update auth.users
       set is_sso_user = coalesce(is_sso_user, false)
     where id = v_admin_id;
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'users'
       and column_name = 'is_anonymous'
  ) then
    update auth.users
       set is_anonymous = coalesce(is_anonymous, false)
     where id = v_admin_id;
  end if;

  v_identity_data := jsonb_build_object(
    'sub', v_admin_id::text,
    'email', v_admin_email,
    'email_verified', true,
    'phone_verified', false
  );

  delete from auth.identities
   where provider = 'email'
     and (
       user_id = v_admin_id
       or lower(identity_data ->> 'email') = lower(v_admin_email)
     );

  select exists (
    select 1
      from information_schema.columns
     where table_schema = 'auth'
       and table_name = 'identities'
       and column_name = 'provider_id'
  )
    into v_has_provider_id;

  select c.udt_name
    into v_identity_id_udt
    from information_schema.columns c
   where c.table_schema = 'auth'
     and c.table_name = 'identities'
     and c.column_name = 'id'
   limit 1;

  if v_has_provider_id then
    if v_identity_id_udt = 'uuid' then
      execute
        'insert into auth.identities (
           id,
           provider_id,
           user_id,
           identity_data,
           provider,
           last_sign_in_at,
           created_at,
           updated_at
         )
         values ($1, $2, $3, $4, $5, timezone(''utc'', now()), timezone(''utc'', now()), timezone(''utc'', now()))
         on conflict do nothing'
      using v_admin_id, v_admin_id::text, v_admin_id, v_identity_data, 'email';
    else
      execute
        'insert into auth.identities (
           id,
           provider_id,
           user_id,
           identity_data,
           provider,
           last_sign_in_at,
           created_at,
           updated_at
         )
         values ($1, $2, $3, $4, $5, timezone(''utc'', now()), timezone(''utc'', now()), timezone(''utc'', now()))
         on conflict do nothing'
      using v_admin_id::text, v_admin_id::text, v_admin_id, v_identity_data, 'email';
    end if;
  else
    if v_identity_id_udt = 'uuid' then
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
      using v_admin_id, v_admin_id, v_identity_data, 'email';
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
