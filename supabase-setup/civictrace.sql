-- CivicTrace shared schema. Run once in your own Supabase project's SQL editor.
-- The public QR website and the official dashboard both use these tables.

create table if not exists public.entities (
  id text primary key,
  entity_type text not null,
  ward text not null,
  location text,
  active boolean not null default true
);

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  employee_number text unique not null,
  full_name text,
  phone text unique not null,          -- E.164, e.g. +919876543210
  role text not null default 'worker', -- 'worker' | 'auditor' | 'official'
  user_id uuid unique references auth.users(id) on delete set null,
  active boolean not null default true
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  entity_id text not null references public.entities(id),
  event_type text not null,            -- citizen_report | collection | inspection | repair | replacement
  status text,                         -- citizen_report starts 'Unverified'
  issue_type text,
  audit_result text,
  note text,
  photo_url text,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  source text not null default 'public_qr_website',
  environment text not null default 'field_test',
  worker_id uuid references public.workers(id),
  employee_number text,
  created_at timestamptz not null default now()
);

grant select on public.entities to anon, authenticated;
grant insert on public.events to anon, authenticated;
grant select on public.workers to authenticated;
grant all on public.entities, public.events, public.workers to service_role;

alter table public.entities enable row level security;
alter table public.events enable row level security;
alter table public.workers enable row level security;

create policy "Public can view active entities" on public.entities
  for select to anon, authenticated using (active);

create policy "Workers see own record" on public.workers
  for select to authenticated using (user_id = auth.uid());

-- Anyone may submit an unverified citizen report (append-only, no reads).
create policy "Citizens submit reports" on public.events
  for insert to anon, authenticated
  with check (event_type = 'citizen_report' and status = 'Unverified' and worker_id is null);

-- Signed-in workers record collections/inspections under their own identity.
create policy "Workers record collection and inspection" on public.events
  for insert to authenticated
  with check (
    event_type in ('collection','inspection')
    and exists (select 1 from public.workers w
      where w.id = worker_id and w.user_id = auth.uid() and w.active
        and w.employee_number = events.employee_number
        and (event_type = 'collection' or w.role in ('auditor','official','worker')))
  );

-- Look up the phone for an employee number so an SMS code can be sent.
create or replace function public.worker_phone(_employee_number text)
returns text language sql stable security definer set search_path = public as $$
  select phone from public.workers where employee_number = upper(trim(_employee_number)) and active limit 1
$$;
grant execute on function public.worker_phone(text) to anon, authenticated;

-- After SMS sign-in, link the auth user to the worker row with that phone.
create or replace function public.claim_worker()
returns public.workers language plpgsql security definer set search_path = public as $$
declare w public.workers; p text;
begin
  select phone into p from auth.users where id = auth.uid();
  update public.workers set user_id = auth.uid()
   where ltrim(phone,'+') = ltrim(p,'+') and active returning * into w;
  return w;
end $$;
grant execute on function public.claim_worker() to authenticated;

-- Photo storage
insert into storage.buckets (id, name, public) values ('event-photos','event-photos', true)
  on conflict (id) do nothing;
create policy "Anyone uploads event photos" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'event-photos');
create policy "Event photos readable" on storage.objects
  for select to anon, authenticated using (bucket_id = 'event-photos');

-- Ward 142 prototype identities: 38 bins + 17 BWGs (edit locations later).
insert into public.entities (id, entity_type, ward, location)
select 'BIN-' || lpad(g::text, 4, '0'), 'Municipal Waste Bin', 'Ward 142', null
from generate_series(1, 38) g on conflict do nothing;
insert into public.entities (id, entity_type, ward, location)
select 'BWG-' || lpad(g::text, 4, '0'), 'Bulk Waste Generator', 'Ward 142', null
from generate_series(1, 17) g on conflict do nothing;

-- Add your workers, e.g.:
-- insert into public.workers (employee_number, full_name, phone, role)
-- values ('EMP1001', 'Test Worker', '+919800000000', 'auditor');
