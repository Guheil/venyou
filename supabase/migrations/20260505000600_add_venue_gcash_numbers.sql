-- Store the venue's receiving GCash number separately from the customer's
-- reservation GCash number.
alter table public.venues
  add column if not exists gcash_number text not null default '';

alter table public.venues
  drop constraint if exists venues_gcash_number_format_chk;

alter table public.venues
  add constraint venues_gcash_number_format_chk
  check (gcash_number = '' or gcash_number ~ '^09[0-9]{9}$');

create index if not exists venues_gcash_number_idx
  on public.venues (gcash_number);
