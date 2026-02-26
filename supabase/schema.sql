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

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.events to authenticated;
