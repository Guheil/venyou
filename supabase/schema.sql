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

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  theme text not null default 'light' check (theme in ('light', 'dark'))
);

create or replace function public.set_user_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_user_preferences_updated_at();

alter table public.user_preferences enable row level security;
alter table public.user_preferences force row level security;

drop policy if exists "Users can read own preferences" on public.user_preferences;
create policy "Users can read own preferences"
  on public.user_preferences
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own preferences" on public.user_preferences;
create policy "Users can insert own preferences"
  on public.user_preferences
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own preferences" on public.user_preferences;
create policy "Users can update own preferences"
  on public.user_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own preferences" on public.user_preferences;
create policy "Users can delete own preferences"
  on public.user_preferences
  for delete
  using (auth.uid() = user_id);

revoke all on public.user_preferences from public;
revoke all on public.user_preferences from anon;
revoke all on public.user_preferences from authenticated;

grant select, insert, update, delete on public.user_preferences to authenticated;

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
  image_url text not null default '',
  base_distance_km numeric(6, 2) not null default 3.0 check (base_distance_km >= 0),
  is_active boolean not null default true
);

alter table public.venues
  add column if not exists image_url text not null default '';

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
  ),
  (
    'b2094453-7cf3-4d79-be5f-9e81600d8883',
    'Santuario de San Antonio Parish',
    'Church / Ceremony Venue',
    '3117 McKinley Road, Forbes Park, Makati City, 1220 Metro Manila, Philippines',
    'Makati',
    'Forbes Park',
    600,
    450,
    4.80,
    720,
    'indoor',
    array['Church', 'Catholic', 'Ceremony', 'Wedding'],
    'Landmark Forbes Park church frequently chosen for Catholic wedding ceremonies and formal rites.',
    'linear-gradient(135deg, #D4D8C6 0%, #ECEFDB 100%)',
    3.9,
    true
  ),
  (
    'd9535179-0bd8-46ab-a0f2-ce40d7f755e7',
    'Nuestra Senora de Gracia Parish Church',
    'Church / Heritage Ceremony Venue',
    '7440 Bernardino Street, Guadalupe Viejo, Makati City, 1211 Metro Manila, Philippines',
    'Makati',
    'Guadalupe Viejo',
    500,
    420,
    4.75,
    680,
    'indoor',
    array['Church', 'Heritage', 'Catholic', 'Wedding'],
    'Historic stone church in Makati favored for classic wedding ceremonies and heritage-focused celebrations.',
    'linear-gradient(135deg, #CFC2B7 0%, #E6DCD2 100%)',
    4.8,
    true
  ),
  (
    'dc622469-d44a-46b6-b4ea-858e4f31ef1c',
    'Quiapo Church',
    'Church / Basilica Ceremony Venue',
    '910 Plaza Miranda, Quiapo, Manila 1001, Philippines',
    'Manila',
    'Quiapo',
    1200,
    380,
    4.70,
    1500,
    'indoor',
    array['Church', 'Basilica', 'Catholic', 'Ceremony'],
    'Major Manila basilica with large seating capacity for religious milestones and church ceremonies.',
    'linear-gradient(135deg, #C7B0A3 0%, #E2D2C8 100%)',
    9.4,
    true
  ),
  (
    '5ac80f3c-3a9b-451d-8417-275deaf4ae03',
    'Fernwood Gardens',
    'Garden Events Venue',
    '69 Cenacle Drive, Sanville Subdivision, Quezon City, Philippines',
    'Quezon City',
    'Sanville Subdivision',
    350,
    1800,
    4.70,
    940,
    'outdoor',
    array['Garden', 'Wedding', 'Debut', 'Corporate'],
    'Established Quezon City garden venue known for weddings, debuts, and upscale outdoor social events.',
    'linear-gradient(135deg, #9FC9A8 0%, #CDE5C8 100%)',
    5.9,
    true
  ),
  (
    'e51abe6e-9e13-4456-9857-9210811ee182',
    'Glass Garden Events Venue',
    'Glasshouse Events Venue',
    '257 Evangelista Avenue, Santolan, Pasig City, Metro Manila, Philippines',
    'Pasig',
    'Santolan',
    250,
    1600,
    4.65,
    560,
    'indoor',
    array['Indoor Garden', 'Wedding', 'Debut', 'Intimate'],
    'Air-conditioned indoor garden venue in Pasig with a bright glasshouse setting for intimate to mid-sized events.',
    'linear-gradient(135deg, #B7D7D3 0%, #D8ECE9 100%)',
    6.2,
    true
  ),
  (
    'f34729a5-9068-495f-b9b3-864e43954100',
    'Casa Manila Patio',
    'Heritage Venue / Patio',
    'Plaza San Luis Complex, General Luna corner Real Streets, Intramuros, Manila, Philippines',
    'Manila',
    'Intramuros',
    180,
    1300,
    4.60,
    210,
    'both',
    array['Heritage', 'Patio', 'Cultural', 'Wedding'],
    'Spanish-colonial courtyard venue inside Intramuros suited for intimate weddings, dinners, and cultural functions.',
    'linear-gradient(135deg, #D7C8B0 0%, #EFE2CC 100%)',
    8.8,
    true
  ),
  (
    '101d0d3e-0521-425e-9020-23ca8e44d688',
    'Baluarte de San Diego Gardens',
    'Historic Garden Venue',
    'Santa Lucia Street corner Muralla Street, Intramuros, Manila, Philippines',
    'Manila',
    'Intramuros',
    300,
    1400,
    4.65,
    260,
    'outdoor',
    array['Garden', 'Historic', 'Wedding', 'Outdoor'],
    'Historic garden site in Intramuros with stone ruins and lawns that work well for outdoor ceremonies and receptions.',
    'linear-gradient(135deg, #B8C88C 0%, #D9E2B7 100%)',
    9.1,
    true
  ),
  (
    'adb547a9-2a34-4e94-85b6-e821598a3ac1',
    'Ayala Museum',
    'Museum / Cultural Venue',
    'Ayala Museum Bldg., Makati Avenue corner De La Rosa Street, Greenbelt Park, Makati City 1224, Philippines',
    'Makati',
    'Greenbelt Park',
    220,
    1600,
    4.70,
    430,
    'indoor',
    array['Museum', 'Cultural', 'Corporate', 'Launch'],
    'Modern museum venue in Makati suited for launches, talks, private receptions, and curated corporate gatherings.',
    'linear-gradient(135deg, #AEB9C9 0%, #D8E0EA 100%)',
    4.3,
    true
  ),
  (
    'b777d334-bc3a-45bf-be64-8abd194499a3',
    'Pinto Art Museum',
    'Museum / Garden Venue',
    '1 Sierra Madre Street, Grand Heights Road, Antipolo, Rizal, Philippines',
    'Antipolo',
    'Grand Heights',
    180,
    1500,
    4.75,
    890,
    'both',
    array['Museum', 'Art', 'Garden', 'Intimate'],
    'Antipolo museum and garden estate ideal for intimate weddings, private receptions, and artistic events.',
    'linear-gradient(135deg, #E1E7D0 0%, #F0F4E4 100%)',
    11.6,
    true
  ),
  (
    'dee30611-56ac-4e6e-b6f1-e465c776bd6e',
    'Manila Polo Club',
    'Private Club / Events Venue',
    '35 McKinley Road, Forbes Park, Makati City, Philippines 1220',
    'Makati',
    'Forbes Park',
    300,
    2200,
    4.70,
    320,
    'both',
    array['Private Club', 'Corporate', 'Wedding', 'Premium'],
    'Prestige Forbes Park club venue with indoor dining spaces and open grounds for premium social and corporate events.',
    'linear-gradient(135deg, #AFC5AE 0%, #D6E3D1 100%)',
    3.8,
    true
  ),
  (
    '39829373-bc7a-4dca-9077-57e382b68792',
    'Club Balai Isabel',
    'Lakeside Resort / Events Venue',
    'Barangay Banga, Talisay, Batangas 4220, Philippines',
    'Talisay',
    'Barangay Banga',
    800,
    1250,
    4.45,
    640,
    'both',
    array['Lakeside', 'Resort', 'Wedding', 'Team Building'],
    'Taal Lake resort destination with multiple function areas for weddings, retreats, and company outings.',
    'linear-gradient(135deg, #9EC4D8 0%, #CDE2EC 100%)',
    14.5,
    true
  ),
  (
    '9ed0293f-2772-4299-a0a4-46beb187f674',
    'Hillcreek Gardens Tagaytay',
    'Garden Estate / Events Venue',
    '134 Tagaytay-Alfonso Road, Barangay Sikat, Alfonso, Cavite 4123, Philippines',
    'Alfonso',
    'Barangay Sikat',
    500,
    1700,
    4.70,
    510,
    'both',
    array['Garden', 'Tagaytay', 'Wedding', 'Estate'],
    'South-of-Manila garden estate popular for weddings and milestone events with indoor and outdoor venue options.',
    'linear-gradient(135deg, #B8D2A4 0%, #DDE9CB 100%)',
    13.8,
    true
  ),
  (
    'afc224b7-1b39-4c4e-af32-27658915177c',
    'Las Casas Filipinas de Acuzar',
    'Heritage Resort / Events Venue',
    'Barangay Ibaba, Bagac, Bataan 2107, Philippines',
    'Bagac',
    'Barangay Ibaba',
    1000,
    2100,
    4.70,
    780,
    'both',
    array['Heritage', 'Resort', 'Wedding', 'Destination'],
    'Large heritage resort in Bagac with restored Filipino architecture and multiple venues for destination celebrations.',
    'linear-gradient(135deg, #D0B89B 0%, #EADAC7 100%)',
    18.6,
    true
  ),
  (
    'e98449f5-9718-4ea7-a038-f0997c654601',
    'The Lind Boracay',
    'Beach Resort / Events Venue',
    'Station 1, Barangay Balabag, Boracay Island, Malay, Aklan 5608, Philippines',
    'Malay',
    'Station 1, Balabag',
    300,
    2600,
    4.80,
    1200,
    'both',
    array['Beach', 'Resort', 'Wedding', 'Luxury'],
    'Premium Station 1 Boracay resort for beachfront weddings, private dinners, and destination corporate retreats.',
    'linear-gradient(135deg, #9ED4E8 0%, #D2EDF7 100%)',
    12.7,
    true
  ),
  (
    '4b27d446-d86a-45d1-899e-3816dfc12fdd',
    'Amorita Resort',
    'Clifftop Beach Resort / Events Venue',
    '1 Ester A. Lim Drive, Barangay Tawala, Alona Beach, Panglao Island, Bohol 6340, Philippines',
    'Panglao',
    'Tawala / Alona Beach',
    150,
    2500,
    4.75,
    910,
    'both',
    array['Beach', 'Resort', 'Clifftop', 'Wedding'],
    'Clifftop Panglao resort with sea-view function options for destination weddings and intimate executive gatherings.',
    'linear-gradient(135deg, #A7D3E2 0%, #D5EDF3 100%)',
    11.2,
    true
  ),
  (
    'd1f13c58-eb49-41cd-a703-e19f1f2557b6',
    'The Bellevue Resort',
    'Beach Resort / Events Venue',
    'Barangay Doljo, Panglao Island, Bohol 6340, Philippines',
    'Panglao',
    'Doljo',
    250,
    2200,
    4.70,
    760,
    'both',
    array['Beach', 'Resort', 'Wedding', 'Corporate'],
    'Beachfront Panglao resort with function spaces and scenic outdoor areas for weddings, incentives, and private events.',
    'linear-gradient(135deg, #A8C9D9 0%, #D5E6EF 100%)',
    12.4,
    true
  ),
  (
    '7d27214c-87c2-41a8-9705-5ed46fda0206',
    'Marco Polo Plaza Cebu',
    'Hotel / Ballroom',
    'Cebu Veterans Drive, Nivel Hills, Apas, Cebu City 6000, Philippines',
    'Cebu City',
    'Nivel Hills',
    1000,
    1800,
    4.65,
    840,
    'indoor',
    array['Hotel', 'Ballroom', 'Corporate', 'Wedding'],
    'Hilltop Cebu hotel with established ballroom and meeting facilities for large banquets and corporate programs.',
    'linear-gradient(135deg, #B4C6D6 0%, #DCE5ED 100%)',
    4.9,
    true
  ),
  (
    '63333c02-c837-472a-aa6b-de8311e8615e',
    'SMX Convention Center Clark',
    'Convention Center',
    'SM City Clark Complex, M.A. Roxas Highway, Clark, Barangay Dau, Mabalacat City, Pampanga 2010, Philippines',
    'Mabalacat City',
    'Clark / Barangay Dau',
    4620,
    1200,
    4.60,
    520,
    'indoor',
    array['Convention', 'Exhibit', 'Conference', 'Large Capacity'],
    'Northern Luzon MICE venue beside SM City Clark built for exhibitions, conferences, graduations, and large-scale socials.',
    'linear-gradient(135deg, #B1BDD6 0%, #D8E0F0 100%)',
    15.8,
    true
  ),
  (
    '2acaa3a1-4311-41ef-9725-6f3dfde5f13b',
    'SMX Aura',
    'Convention Center / Function Venue',
    '3rd and 4th Level, SM Aura Premier, 26th Street corner McKinley Parkway, Taguig, 1630 Metro Manila, Philippines',
    'Taguig',
    'BGC',
    2250,
    1350,
    4.60,
    610,
    'indoor',
    array['Convention', 'Corporate', 'BGC', 'Flexible Spaces'],
    'BGC convention venue inside SM Aura Premier with function rooms for conferences, launches, and formal gatherings.',
    'linear-gradient(135deg, #B9C7DF 0%, #DCE5F3 100%)',
    2.9,
    true
  ),
  (
    '18506635-99f3-4c22-b433-64303aa390f4',
    'NUSTAR Resort and Casino Cebu',
    'Integrated Resort / Events Venue',
    'Kawit Island, South Road Properties, Cebu City, 6000 Cebu, Philippines',
    'Cebu City',
    'South Road Properties',
    1500,
    3200,
    4.75,
    680,
    'both',
    array['Luxury', 'Integrated Resort', 'Cebu', 'Corporate'],
    'High-end Cebu integrated resort destination for gala dinners, launches, weddings, and premium business events.',
    'linear-gradient(135deg, #C6B0D8 0%, #E3D6ED 100%)',
    6.4,
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

update public.venues
set
  image_url = case id::text
    when '1f74fd78-45b8-4e72-93f5-a2ac5ab6d101' then 'https://en.wikipedia.org/wiki/Special:FilePath/Shangri-La_at_the_Fort%2C_Manila.jpg'
    when 'f4d6021e-8759-4b0b-80ab-40f16f3ab3ce' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Araneta_Center_%28Cubao%2C_Quezon_City%29%282017-08-13%29.jpg'
    when 'b0eb0f84-ed83-4b1f-9050-9f2037fdab2f' then 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Peninsula_Manila%2C_Makati_City%2C_Feb_2024.jpg'
    when 'bbfdd9be-bf27-4af4-96c6-d21f9f3bd57a' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Bay_Area_City_Pasay_13.jpg'
    when 'd4f1a4f8-a508-43ad-b0ce-5df501e30d4b' then 'https://commons.wikimedia.org/wiki/Special:FilePath/SMX_Convention_Center_12.jpg'
    when '57f64544-b9a0-4f95-87ce-c21ed2ae4773' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Manila_Hotel_view.jpg'
    when '2da8aa80-ca4a-4f49-b0a6-26f6f2f7358d' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Okada_manila.jpg'
    when '4ac5db07-4b71-4f1a-a36b-ad6c8418ef08' then 'https://commons.wikimedia.org/wiki/Special:FilePath/City_Of_Dreams.jpg'
    when '3f741d6a-7f0d-47a6-9a62-d00e6f203175' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Edsa_Shangri-La%2C_Manila_in_2025.jpg'
    when '6c2d9f60-62b6-4a18-aa33-91844d3ec516' then 'https://commons.wikimedia.org/wiki/Special:FilePath/F._Ortigas_Jr._Road_2021.jpg'
    when 'b2094453-7cf3-4d79-be5f-9e81600d8883' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Santuario_de_San_Antonio.jpg'
    when 'd9535179-0bd8-46ab-a0f2-ce40d7f755e7' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Nuestra_Senora_de_Gracia_Church_Makati_Philippines.jpg'
    when 'dc622469-d44a-46b6-b4ea-858e4f31ef1c' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Quiapo_Church%2C_Manila.JPG'
    when 'f34729a5-9068-495f-b9b3-864e43954100' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Casa_Manila_%28courtyard%29.jpg'
    when '101d0d3e-0521-425e-9020-23ca8e44d688' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Baluarte_de_San_Diego%2C_Manila%2C_Filipinas%2C_2023-08-27%2C_DD_62.jpg'
    when 'adb547a9-2a34-4e94-85b6-e821598a3ac1' then 'https://commons.wikimedia.org/wiki/Special:FilePath/Ayala_Museum%2C_Makati%2C_Feb_2025_%281%29.jpg'
    else image_url
  end,
  updated_at = timezone('utc', now())
where id::text in (
  '1f74fd78-45b8-4e72-93f5-a2ac5ab6d101',
  'f4d6021e-8759-4b0b-80ab-40f16f3ab3ce',
  'b0eb0f84-ed83-4b1f-9050-9f2037fdab2f',
  'bbfdd9be-bf27-4af4-96c6-d21f9f3bd57a',
  'd4f1a4f8-a508-43ad-b0ce-5df501e30d4b',
  '57f64544-b9a0-4f95-87ce-c21ed2ae4773',
  '2da8aa80-ca4a-4f49-b0a6-26f6f2f7358d',
  '4ac5db07-4b71-4f1a-a36b-ad6c8418ef08',
  '3f741d6a-7f0d-47a6-9a62-d00e6f203175',
  '6c2d9f60-62b6-4a18-aa33-91844d3ec516',
  'b2094453-7cf3-4d79-be5f-9e81600d8883',
  'd9535179-0bd8-46ab-a0f2-ce40d7f755e7',
  'dc622469-d44a-46b6-b4ea-858e4f31ef1c',
  'f34729a5-9068-495f-b9b3-864e43954100',
  '101d0d3e-0521-425e-9020-23ca8e44d688',
  'adb547a9-2a34-4e94-85b6-e821598a3ac1'
);

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
  image_url,
  base_distance_km,
  is_active
)
values
  (
    '88087d09-b724-4e05-af09-273ce56b0b0f',
    'The Bayleaf Intramuros',
    'Hotel / Rooftop & Function Rooms',
    'Muralla corner Victoria Streets, Intramuros, Manila 1002, Philippines',
    'Manila',
    'Intramuros',
    250,
    1850,
    4.55,
    680,
    'both',
    array['Hotel', 'Rooftop', 'Wedding', 'Corporate'],
    'Intramuros hotel with function rooms, social packages, and rooftop city views for weddings, debuts, and business gatherings.',
    'linear-gradient(135deg, #B9C4A4 0%, #DFE7CE 100%)',
    'https://commons.wikimedia.org/wiki/Special:FilePath/The_Bayleaf%2C_a_hotel_in_Intramuros%2C_Manila.jpg',
    8.6,
    true
  ),
  (
    '7328a54a-edd1-45f9-ae69-1f69e6dea3c7',
    'Century Park Hotel Manila',
    'Hotel / Grand Ballroom',
    '599 P. Ocampo Street, Malate, Manila 1004, Philippines',
    'Manila',
    'Malate',
    600,
    1650,
    4.45,
    920,
    'indoor',
    array['Hotel', 'Ballroom', 'Corporate', 'Wedding'],
    'Malate hotel with a large grand ballroom and multiple function rooms for weddings, galas, conferences, and milestone events.',
    'linear-gradient(135deg, #B5C0CE 0%, #DEE5EC 100%)',
    'https://commons.wikimedia.org/wiki/Special:FilePath/04948jfStreets_Adriatico_Harrison_Plaza_SM_Century_Park_Buildings_Malate_Manilafvf_10.jpg',
    7.8,
    true
  ),
  (
    'edb12ad8-0fcc-4248-a2b3-a6083b648d1f',
    'Manila Prince Hotel',
    'Hotel / Function Rooms',
    '1000 San Marcelino Street, Ermita, Manila 1000, Philippines',
    'Manila',
    'Ermita',
    600,
    1450,
    4.35,
    760,
    'indoor',
    array['Hotel', 'Function Rooms', 'Business', 'Wedding'],
    'Ermita hotel with flexible event rooms for meetings, conferences, weddings, and social gatherings in central Manila.',
    'linear-gradient(135deg, #C9B8A8 0%, #E9DDD2 100%)',
    'https://commons.wikimedia.org/wiki/Special:FilePath/0387jfErmita_Manila_Manila_Prince_Hotel_San_Marcelino_Streetfvf_05.jpg',
    8.1,
    true
  ),
  (
    'dc47aa75-7b3a-4478-8dcd-e7ac4f650a5d',
    'Winford Resort & Casino Manila',
    'Resort Hotel / Ballroom',
    'San Lazaro Tourism and Business Park, MJC Drive, Sta. Cruz, Manila, Philippines',
    'Manila',
    'Sta. Cruz',
    1000,
    1850,
    4.45,
    700,
    'indoor',
    array['Hotel', 'Ballroom', 'Entertainment', 'Corporate'],
    'Sta. Cruz resort hotel with a large ballroom, hospitality facilities, and event support for grand celebrations and corporate programs.',
    'linear-gradient(135deg, #C0B3D1 0%, #E2D9EE 100%)',
    'https://commons.wikimedia.org/wiki/Special:FilePath/06524jfSan_Lazaro_Tourism_Business_Park_Winford_Hotel_%26_Casino_Manilafvf_01.jpg',
    9.2,
    true
  ),
  (
    '5cab6091-1270-4887-b3fa-4566516f5a43',
    'Manila Cathedral',
    'Cathedral / Ceremony Venue',
    'Cabildo corner Beaterio Streets, Intramuros, Manila 1002, Philippines',
    'Manila',
    'Intramuros',
    1000,
    420,
    4.85,
    2100,
    'indoor',
    array['Church', 'Cathedral', 'Catholic', 'Wedding'],
    'Historic Intramuros cathedral and major Catholic ceremony venue for weddings, religious milestones, and formal rites.',
    'linear-gradient(135deg, #CEC1AD 0%, #E9DDCA 100%)',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Manila%2C_Manila_Cathedral%2C_Philippines.jpg',
    8.7,
    true
  ),
  (
    '673c6157-9aef-4d6f-8ee8-3af9b692de44',
    'San Agustin Church Manila',
    'Church / Heritage Ceremony Venue',
    'General Luna Street, Intramuros, Manila 1002, Philippines',
    'Manila',
    'Intramuros',
    700,
    430,
    4.85,
    1600,
    'indoor',
    array['Church', 'Heritage', 'Catholic', 'Wedding'],
    'UNESCO-listed Intramuros church suited for heritage Catholic ceremonies, intimate weddings, and cultural milestone rites.',
    'linear-gradient(135deg, #D1C0AA 0%, #EADDCB 100%)',
    'https://commons.wikimedia.org/wiki/Special:FilePath/San_Agustin_Church_-_Intramuros.jpg',
    8.9,
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
  image_url = excluded.image_url,
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
  image_url text,
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
    ranked.image_url,
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

-- ─────────────────────────────────────────────────────────────
-- VENUE RESERVATIONS
-- ─────────────────────────────────────────────────────────────

create table if not exists public.venue_reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,

  -- When the event is happening
  event_date date not null,
  start_time text not null default '08:00',
  duration_hours integer not null default 4 check (duration_hours between 1 and 24),

  -- Guest & cost
  guest_count integer not null check (guest_count > 0),
  price_per_head integer not null check (price_per_head >= 0),
  total_amount integer not null check (total_amount >= 0),

  -- Contact info filled in during reservation
  contact_name text not null,
  contact_phone text not null,
  special_requests text not null default '',

  -- Payment
  payment_method text not null check (payment_method in ('cash', 'gcash')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  gcash_number text,
  payment_reference text,

  -- Reservation lifecycle
  reservation_status text not null default 'pending_payment'
    check (reservation_status in ('pending_payment', 'confirmed', 'cancelled')),

  -- Unique human-readable reference (shown to the user)
  reference_number text not null unique,

  -- Pending reservations expire after 30 minutes to free up the slot
  expires_at timestamptz
);

-- Prevent any two active reservations for the same venue on the same date.
-- Cancelled reservations do not block the slot.
create unique index if not exists venue_reservations_no_double_book_idx
  on public.venue_reservations (venue_id, event_date)
  where reservation_status <> 'cancelled';

create index if not exists venue_reservations_user_id_idx
  on public.venue_reservations (user_id, created_at desc);

create index if not exists venue_reservations_venue_id_idx
  on public.venue_reservations (venue_id, event_date);

create or replace function public.set_venue_reservations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_venue_reservations_updated_at on public.venue_reservations;
create trigger trg_venue_reservations_updated_at
before update on public.venue_reservations
for each row execute function public.set_venue_reservations_updated_at();

alter table public.venue_reservations enable row level security;
alter table public.venue_reservations force row level security;

drop policy if exists "Users can read own reservations" on public.venue_reservations;
create policy "Users can read own reservations"
  on public.venue_reservations
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own reservations" on public.venue_reservations;
create policy "Users can insert own reservations"
  on public.venue_reservations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reservations" on public.venue_reservations;
create policy "Users can update own reservations"
  on public.venue_reservations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow reading active (non-cancelled) reservations for a venue so the UI
-- can show whether a date is already taken.
drop policy if exists "Authenticated users can read venue availability" on public.venue_reservations;
create policy "Authenticated users can read venue availability"
  on public.venue_reservations
  for select
  using (
    auth.role() = 'authenticated'
    and reservation_status <> 'cancelled'
  );

revoke all on public.venue_reservations from public;
revoke all on public.venue_reservations from anon;
revoke all on public.venue_reservations from authenticated;

grant select, insert, update on public.venue_reservations to authenticated;

-- ─────────────────────────────────────────────────────────────
-- ATOMIC CREATE-RESERVATION FUNCTION
-- Runs as SECURITY DEFINER (DB owner) so it can acquire a
-- row-level lock on venues without needing the caller to have
-- UPDATE privileges.  auth.uid() is still verified inside.
-- ─────────────────────────────────────────────────────────────
drop function if exists public.create_venue_reservation(
  uuid, uuid, uuid, date, text, integer, integer, integer, integer,
  text, text, text, text, text
);
create or replace function public.create_venue_reservation(
  p_venue_id       uuid,
  p_event_id       uuid,
  p_event_date     date,
  p_start_time     text,
  p_duration_hours integer,
  p_guest_count    integer,
  p_price_per_head integer,
  p_total_amount   integer,
  p_contact_name   text,
  p_contact_phone  text,
  p_special_requests text,
  p_payment_method text
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
  v_existing_id    uuid;
  v_ref            text;
  v_new_id         uuid;
  v_expires_at     timestamptz;
begin
  -- Reject unauthenticated callers even though we run as security definer
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using hint = 'You must be logged in to make a reservation.';
  end if;

  -- Lock the venue row for the duration of this transaction so concurrent
  -- calls for the same venue serialize properly.
  perform id
    from public.venues
   where id = p_venue_id
     and is_active = true
     for update;

  if not found then
    raise exception 'VENUE_NOT_FOUND' using hint = 'The venue does not exist or is inactive.';
  end if;

  -- Check for a live reservation on the same date
  select vr.id
    into v_existing_id
    from public.venue_reservations vr
   where vr.venue_id = p_venue_id
     and vr.event_date = p_event_date
     and vr.reservation_status <> 'cancelled'
     and (vr.expires_at is null or vr.expires_at > now())
   limit 1;

  if found then
    -- Return conflict flag so the caller can show an appropriate message
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

grant execute on function public.create_venue_reservation(
  uuid, uuid, date, text, integer, integer, integer, integer,
  text, text, text, text
) to authenticated;

-- Revoke direct execute from public/anon to be safe
revoke all on function public.create_venue_reservation(
  uuid, uuid, date, text, integer, integer, integer, integer,
  text, text, text, text
) from public, anon;

-- ─────────────────────────────────────────────────────────────
-- CONFIRM PAYMENT FUNCTION
-- Marks the reservation as paid + confirmed, clears the expiry.
-- ─────────────────────────────────────────────────────────────
drop function if exists public.confirm_reservation_payment(uuid, text);
create or replace function public.confirm_reservation_payment(
  p_reservation_id uuid,
  p_payment_reference text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.venue_reservations
     set payment_status      = 'paid',
         reservation_status  = 'confirmed',
         payment_reference   = p_payment_reference,
         expires_at          = null
   where id            = p_reservation_id
     and user_id       = auth.uid()
     and reservation_status = 'pending_payment'
     and payment_status     = 'pending';

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function public.confirm_reservation_payment(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- CANCEL RESERVATION FUNCTION
-- ─────────────────────────────────────────────────────────────
drop function if exists public.cancel_venue_reservation(uuid);
create or replace function public.cancel_venue_reservation(p_reservation_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.venue_reservations
     set reservation_status = 'cancelled',
         payment_status     = case
                                when payment_status = 'paid' then 'refunded'
                                else 'failed'
                              end
   where id       = p_reservation_id
     and user_id  = auth.uid()
     and reservation_status <> 'cancelled';

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

grant execute on function public.cancel_venue_reservation(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- CLEANUP EXPIRED PENDING RESERVATIONS
-- In production this would be called by a cron job.
-- Exposed as an RPC so the client can call it on page load.
-- ─────────────────────────────────────────────────────────────
drop function if exists public.release_expired_reservations();
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
     and expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.release_expired_reservations() to authenticated;
