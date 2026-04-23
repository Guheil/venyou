-- Add venue image URLs and Manila venue seed data.

alter table public.venues
  add column if not exists image_url text;

update public.venues
set image_url = ''
where image_url is null;

alter table public.venues
  alter column image_url set default '';

alter table public.venues
  alter column image_url set not null;

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
