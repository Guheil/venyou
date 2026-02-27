create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  event_name text not null,
  occasion text not null,
  description text not null default '',
  pax integer not null check (pax > 0),
  budget_min integer not null check (budget_min >= 0),
  budget_max integer not null check (budget_max >= budget_min),
  budget_type text not null check (budget_type in ('per-head', 'total')),
  city text not null,
  area text not null default '',
  radius_km integer not null default 10 check (radius_km between 1 and 100),
  setting text not null check (setting in ('indoor', 'outdoor', 'both')),
  event_date text not null default '',
  start_time text not null default '',
  duration_hours integer not null default 4 check (duration_hours between 1 and 24),
  amenities text[] not null default '{}',
  catering text not null check (catering in ('included', 'external', 'none')),
  tone_keywords text not null default '',
  extra_notes text not null default '',
  status text not null default 'Draft' check (status in ('Draft', 'In Review', 'Confirmed')),
  venue_count integer not null default 0 check (venue_count >= 0),
  top_venue_id text,
  top_venue_name text
);

create index if not exists events_user_id_created_at_idx
  on public.events (user_id, created_at desc);

create index if not exists events_user_id_status_idx
  on public.events (user_id, status);

create or replace function public.set_events_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_events_updated_at on public.events;
create trigger trg_events_updated_at
before update on public.events
for each row execute function public.set_events_updated_at();

alter table public.events enable row level security;
alter table public.events force row level security;

drop policy if exists "Users can read own events" on public.events;
create policy "Users can read own events"
  on public.events
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own events" on public.events;
create policy "Users can insert own events"
  on public.events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own events" on public.events;
create policy "Users can update own events"
  on public.events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own events" on public.events;
create policy "Users can delete own events"
  on public.events
  for delete
  using (auth.uid() = user_id);

revoke all on public.events from public;
revoke all on public.events from anon;
revoke all on public.events from authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.events to authenticated;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  name text not null,
  type text not null,
  address text not null,
  city text not null,
  area text not null default '',
  capacity integer not null check (capacity > 0),
  price_per_head integer not null check (price_per_head >= 0),
  rating numeric(3, 2) not null default 4.5 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  setting text not null check (setting in ('indoor', 'outdoor', 'both')),
  tags text[] not null default '{}',
  description text not null default '',
  image_color text not null default 'linear-gradient(135deg, #BDD7D2 0%, #D6E8E4 100%)',
  base_distance_km numeric(6, 2) not null default 3.0 check (base_distance_km >= 0),
  is_active boolean not null default true
);

create unique index if not exists venues_name_address_key
  on public.venues (name, address);

create index if not exists venues_city_setting_idx
  on public.venues (city, setting);

create index if not exists venues_capacity_price_idx
  on public.venues (capacity, price_per_head);

create index if not exists venues_tags_gin_idx
  on public.venues using gin (tags);

create or replace function public.set_venues_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_venues_updated_at on public.venues;
create trigger trg_venues_updated_at
before update on public.venues
for each row execute function public.set_venues_updated_at();

alter table public.venues enable row level security;
alter table public.venues force row level security;

drop policy if exists "Authenticated users can read venues" on public.venues;
create policy "Authenticated users can read venues"
  on public.venues
  for select
  using (auth.role() = 'authenticated' and is_active = true);

revoke all on public.venues from public;
revoke all on public.venues from anon;
revoke all on public.venues from authenticated;

grant select on public.venues to authenticated;

insert into public.venues (
  id,
  name,
  type,
  address,
  city,
  area,
  capacity,
  price_per_head,
  rating,
  review_count,
  setting,
  tags,
  description,
  image_color,
  base_distance_km,
  is_active
)
values
  (
    '1f74fd78-45b8-4e72-93f5-a2ac5ab6d101',
    'Shangri-La The Fort, Manila',
    'Luxury Hotel / Grand Ballroom',
    '30th Street corner 5th Avenue, Bonifacio Global City, Taguig City, 1634 Metro Manila, Philippines',
    'Taguig (BGC)',
    'Bonifacio Global City',
    1200,
    2600,
    4.80,
    1388,
    'indoor',
    array['Luxury', 'Ballroom', 'Corporate', 'Wedding'],
    'Flagship BGC hotel with large event spaces suited for premium weddings, conferences, and gala receptions.',
    'linear-gradient(135deg, #9FC3DE 0%, #C6DEF3 100%)',
    2.4,
    true
  ),
  (
    'f4d6021e-8759-4b0b-80ab-40f16f3ab3ce',
    'Novotel Manila Araneta City',
    'City Hotel / Ballroom',
    'General Aguinaldo Avenue, Araneta City, 0810 Quezon City, Philippines',
    'Quezon City',
    'Araneta City',
    600,
    1700,
    4.55,
    1600,
    'indoor',
    array['Ballroom', 'Business', 'Central Location'],
    'Major Quezon City events hotel with modern function rooms, banquet support, and direct access to Araneta City.',
    'linear-gradient(135deg, #C7B3E5 0%, #E0D1F3 100%)',
    6.8,
    true
  ),
  (
    'b0eb0f84-ed83-4b1f-9050-9f2037fdab2f',
    'The Peninsula Manila',
    'Luxury Hotel / Ballroom',
    'Corner of Ayala and Makati Avenues, 1226 Makati City, Metro Manila, Philippines',
    'Makati',
    'Ayala Center',
    700,
    2300,
    4.85,
    3002,
    'indoor',
    array['Luxury', 'Classic', 'Ballroom'],
    'Established five-star Makati venue known for formal ballroom events and high-touch service standards.',
    'linear-gradient(135deg, #D4C1A8 0%, #E9D9C3 100%)',
    4.1,
    true
  ),
  (
    'bbfdd9be-bf27-4af4-96c6-d21f9f3bd57a',
    'Conrad Manila',
    'Bayfront Hotel / Ballroom',
    'Seaside Boulevard corner Coral Way, Mall of Asia Complex, Pasay City 1300, Philippines',
    'Pasay',
    'Mall of Asia Complex',
    650,
    2200,
    4.70,
    2100,
    'outdoor',
    array['Bay View', 'Ballroom', 'Premium'],
    'Premium bayfront destination with upscale ballrooms near Mall of Asia and business access points.',
    'linear-gradient(135deg, #8FBFE0 0%, #BADAF0 100%)',
    6.5,
    true
  ),
  (
    'd4f1a4f8-a508-43ad-b0ce-5df501e30d4b',
    'SMX Convention Center Manila',
    'Convention Center',
    'Seashell Lane, Mall of Asia Complex, Pasay City 1300, Philippines',
    'Pasay',
    'Mall of Asia Complex',
    10000,
    1200,
    4.40,
    1200,
    'indoor',
    array['Convention', 'Exhibit', 'Large Capacity'],
    'Large-scale convention and exhibition venue for major trade events, conferences, and corporate functions.',
    'linear-gradient(135deg, #9FB6C8 0%, #C7D7E1 100%)',
    7.4,
    true
  ),
  (
    '57f64544-b9a0-4f95-87ce-c21ed2ae4773',
    'The Manila Hotel',
    'Historic Hotel / Ballroom',
    '1 Rizal Park, Ermita, Manila, 0913 Metro Manila, Philippines',
    'Manila',
    'Ermita',
    500,
    1900,
    4.60,
    2400,
    'indoor',
    array['Historic', 'Classic', 'Wedding'],
    'Historic luxury landmark near Rizal Park, popular for formal receptions and milestone celebrations.',
    'linear-gradient(135deg, #CEC5BA 0%, #E4DDD4 100%)',
    8.9,
    true
  ),
  (
    '2da8aa80-ca4a-4f49-b0a6-26f6f2f7358d',
    'Okada Manila',
    'Integrated Resort / Grand Ballroom',
    'New Seaside Drive, Entertainment City, Paranaque City, 1701 Metro Manila, Philippines',
    'Paranaque',
    'Entertainment City',
    2500,
    2800,
    4.70,
    3300,
    'indoor',
    array['Luxury', 'Integrated Resort', 'Grand Ballroom'],
    'Integrated resort destination with expansive event spaces for galas, product launches, and upscale banquets.',
    'linear-gradient(135deg, #C8A9D8 0%, #E0CCE9 100%)',
    9.8,
    true
  ),
  (
    '4ac5db07-4b71-4f1a-a36b-ad6c8418ef08',
    'City of Dreams Manila',
    'Integrated Resort / Event Hotel',
    'Asean Avenue corner Roxas Boulevard, Entertainment City, Paranaque 1701, Manila, Philippines',
    'Paranaque',
    'Entertainment City',
    900,
    2100,
    4.55,
    1800,
    'indoor',
    array['Resort', 'Corporate', 'Events'],
    'Major Entertainment City venue with multiple hotel and event options for social and corporate programs.',
    'linear-gradient(135deg, #B9C8E8 0%, #D3DCF3 100%)',
    10.2,
    true
  ),
  (
    '3f741d6a-7f0d-47a6-9a62-d00e6f203175',
    'Edsa Shangri-La, Manila',
    'Luxury Hotel / Ballroom',
    '1 Garden Way, Ortigas Centre, Mandaluyong City 1550, Philippines',
    'Mandaluyong',
    'Ortigas Centre',
    800,
    2000,
    4.65,
    1700,
    'indoor',
    array['Luxury', 'Ballroom', 'Ortigas'],
    'Ortigas landmark hotel with substantial banquet capacity and strong business-event support.',
    'linear-gradient(135deg, #C8D6C0 0%, #E2EBD9 100%)',
    5.1,
    true
  ),
  (
    '6c2d9f60-62b6-4a18-aa33-91844d3ec516',
    'Marco Polo Ortigas Manila',
    'Business Hotel / Ballroom',
    'Meralco Avenue and Sapphire Street, Ortigas Centre, Pasig City, 1600, Philippines',
    'Pasig',
    'Ortigas Centre',
    650,
    1850,
    4.60,
    1200,
    'indoor',
    array['Business District', 'Sky Ballroom', 'Corporate'],
    'Pasig business district venue with elevated ballroom spaces and meeting facilities for formal events.',
    'linear-gradient(135deg, #9CB1C8 0%, #C5D3E2 100%)',
    5.6,
    true
  ),
  (
    '2a64dd1f-259e-4f4e-99c5-f5f4de85c704',
    'Waterfront Cebu City Hotel & Casino',
    'Convention Hotel',
    'Salinas Drive, Lahug, Cebu City, 6000 Philippines',
    'Cebu City',
    'Lahug',
    4000,
    1450,
    4.40,
    980,
    'indoor',
    array['Convention', 'Large Capacity', 'Cebu'],
    'Cebu landmark hotel with extensive convention facilities for multi-track conferences and banquets.',
    'linear-gradient(135deg, #A9C4D8 0%, #D0E1EC 100%)',
    3.4,
    true
  ),
  (
    'cb618cef-0570-4f8d-a52c-ec6721948ec5',
    'SMX Convention Center Davao',
    'Convention Center',
    '3rd Level, SM Lanang Premier, J.P. Laurel Avenue, Lanang, Davao City 8000, Philippines',
    'Davao City',
    'Lanang',
    5550,
    1100,
    4.45,
    620,
    'indoor',
    array['Convention', 'Exhibit', 'Davao'],
    'Large Davao convention facility for trade events, conventions, and corporate meetings.',
    'linear-gradient(135deg, #C4D2E8 0%, #DFE8F5 100%)',
    2.6,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  address = excluded.address,
  city = excluded.city,
  area = excluded.area,
  capacity = excluded.capacity,
  price_per_head = excluded.price_per_head,
  rating = excluded.rating,
  review_count = excluded.review_count,
  setting = excluded.setting,
  tags = excluded.tags,
  description = excluded.description,
  image_color = excluded.image_color,
  base_distance_km = excluded.base_distance_km,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

drop function if exists public.recommend_venues_for_event(uuid, integer);
create or replace function public.recommend_venues_for_event(
  p_event_id uuid,
  p_limit integer default 12
)
returns table (
  id uuid,
  name text,
  type text,
  address text,
  city text,
  area text,
  capacity integer,
  rating numeric,
  review_count integer,
  price_per_head integer,
  tags text[],
  image_color text,
  distance_km numeric,
  total_estimate integer,
  match_score numeric,
  ai_note text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  e public.events%rowtype;
  budget_min_per_head numeric;
  budget_max_per_head numeric;
  query_tokens text[];
  token_count integer;
begin
  select *
  into e
  from public.events
  where events.id = p_event_id
    and events.user_id = auth.uid();

  if not found then
    return;
  end if;

  if e.pax <= 0 then
    return;
  end if;

  if e.budget_type = 'per-head' then
    budget_min_per_head := e.budget_min;
    budget_max_per_head := e.budget_max;
  else
    budget_min_per_head := greatest(0, e.budget_min::numeric / e.pax::numeric);
    budget_max_per_head := greatest(
      budget_min_per_head,
      e.budget_max::numeric / e.pax::numeric
    );
  end if;

  query_tokens := regexp_split_to_array(
    lower(
      trim(
        concat_ws(
          ' ',
          e.occasion,
          e.description,
          e.tone_keywords,
          array_to_string(e.amenities, ' '),
          e.catering
        )
      )
    ),
    '\s+'
  );
  token_count := greatest(1, coalesce(array_length(query_tokens, 1), 0));

  return query
  with ranked as (
    select
      v.*,
      round(
        (
          v.base_distance_km
          + case when lower(v.city) = lower(e.city) then 0 else 7 end
          + case
              when coalesce(e.area, '') = '' then 0
              when coalesce(v.area, '') = '' then 1.8
              when lower(v.area) like '%' || lower(e.area) || '%' then 0
              else 1.8
            end
        )::numeric,
        1
      ) as distance_km,
      (v.price_per_head * e.pax)::integer as total_estimate,
      case
        when v.price_per_head between budget_min_per_head and budget_max_per_head then 1.0
        else greatest(
          0.0,
          1.0 - (
            abs(v.price_per_head - ((budget_min_per_head + budget_max_per_head) / 2))
            / greatest(1, ((budget_min_per_head + budget_max_per_head) / 2))
          )
        )
      end as budget_score,
      case
        when v.capacity < e.pax then 0.0
        when v.capacity between e.pax and ceil(e.pax * 1.4) then 1.0
        when v.capacity <= ceil(e.pax * 2.5) then 0.8
        else 0.55
      end as capacity_score,
      case
        when e.setting = 'both' then 1.0
        when v.setting = e.setting then 1.0
        when v.setting = 'both' then 0.85
        else 0.35
      end as setting_score,
      case
        when lower(v.city) = lower(e.city) then 1.0
        else 0.45
      end as location_score,
      case
        when coalesce(e.area, '') = '' then 0.8
        when coalesce(v.area, '') = '' then 0.55
        when lower(v.area) like '%' || lower(e.area) || '%' then 1.0
        else 0.55
      end as area_score,
      greatest(
        0.0,
        least(
          1.0,
          (
            select count(*)::numeric
            from unnest(query_tokens) token
            where token <> ''
              and length(token) > 2
              and (
                lower(v.name) like '%' || token || '%'
                or lower(v.type) like '%' || token || '%'
                or lower(v.description) like '%' || token || '%'
                or exists (
                  select 1
                  from unnest(v.tags) venue_tag
                  where lower(venue_tag) like '%' || token || '%'
                )
              )
          ) / token_count::numeric
        )
      ) as semantic_score
    from public.venues v
    where v.is_active = true
  )
  select
    ranked.id,
    ranked.name,
    ranked.type,
    ranked.address,
    ranked.city,
    ranked.area,
    ranked.capacity,
    ranked.rating,
    ranked.review_count,
    ranked.price_per_head,
    ranked.tags,
    ranked.image_color,
    ranked.distance_km,
    ranked.total_estimate,
    round(
      (
        ranked.budget_score * 0.28
        + ranked.capacity_score * 0.20
        + ranked.setting_score * 0.18
        + ranked.location_score * 0.12
        + ranked.area_score * 0.08
        + ranked.semantic_score * 0.14
      ) * 100::numeric,
      1
    ) as match_score,
    (
      case
        when ranked.budget_score >= 0.85 then
          format(
            'Price at PHP %s/head fits your target budget; capacity %s is aligned for %s guests.',
            to_char(ranked.price_per_head, 'FM999,999,999'),
            ranked.capacity,
            e.pax
          )
        when ranked.budget_score >= 0.60 then
          format(
            'Price at PHP %s/head is close to your target; capacity %s is workable for %s guests.',
            to_char(ranked.price_per_head, 'FM999,999,999'),
            ranked.capacity,
            e.pax
          )
        else
          format(
            'Price at PHP %s/head is farther from your target range; capacity %s still supports %s guests.',
            to_char(ranked.price_per_head, 'FM999,999,999'),
            ranked.capacity,
            e.pax
          )
      end
      || ' '
      || case
        when lower(ranked.city) = lower(e.city) then
          format(
            'Location stays in %s with about %s km estimated travel.',
            ranked.city,
            to_char(ranked.distance_km, 'FM999,990.0')
          )
        else
          format(
            'Location is in %s, about %s km from your preferred city %s.',
            ranked.city,
            to_char(ranked.distance_km, 'FM999,990.0'),
            e.city
          )
      end
      || ' '
      || case
        when ranked.semantic_score >= 0.45 and array_length(ranked.tags, 1) > 0 then
          format(
            'Theme alignment is strong with tags like %s.',
            array_to_string(ranked.tags[1:least(2, array_length(ranked.tags, 1))], ', ')
          )
        when ranked.semantic_score >= 0.30 then
          'Theme alignment is moderate based on your event brief and preferences.'
        else
          'Ranking is mainly driven by budget, capacity, and location fit.'
      end
    ) as ai_note
  from ranked
  order by match_score desc, ranked.distance_km asc, ranked.rating desc
  limit greatest(1, least(coalesce(p_limit, 12), 50));
end;
$$;

grant execute on function public.recommend_venues_for_event(uuid, integer) to authenticated;
