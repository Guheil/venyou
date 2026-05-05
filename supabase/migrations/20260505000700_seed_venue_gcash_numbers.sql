-- Assign a random Philippine-format GCash number (09XXXXXXXXX) to every
-- venue that currently has no GCash number set.

update public.venues
set gcash_number = '09' || lpad((floor(random() * 1000000000))::bigint::text, 9, '0')
where gcash_number = '';
