-- ============================================================
-- FishPilot AI — Schema Supabase (MVP)
--
-- Come usarlo:
-- 1. Apri il tuo progetto su https://supabase.com/dashboard
-- 2. Vai su "SQL Editor" > "New query"
-- 3. Incolla tutto questo file ed esegui (RUN)
-- ============================================================

-- ============================================================
-- 1. USERS
-- Colonne richieste dalla specifica: id, email, created_at.
-- Supabase gestisce già l'autenticazione in "auth.users": questa
-- tabella pubblica è uno specchio leggero, sincronizzato via trigger,
-- pensato per quando in v2 aggiungerai login reale.
-- Nella v1 l'MVP funziona SENZA login: le uscite di pesca sono
-- anonime (trips.user_id può essere null).
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

-- Trigger: quando un utente si registra in auth.users, crea automaticamente
-- la riga corrispondente in public.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. TRIPS
-- Colonne richieste: id, user_id, start_location, destination, technique, date.
-- Colonne aggiuntive (start_lat/lng, dest_lat/lng): coordinate già
-- geocodificate, necessarie per disegnare la rotta nella pagina Mappa
-- senza dover richiamare l'API di geocoding ogni volta.
--
-- destination/dest_lat/dest_lng sono NULLABLE: la modalità di ricerca
-- predefinita è lo "Spot Singolo" (start_location è l'unico punto), la
-- "Tratta" (partenza + destinazione) resta disponibile come modalità
-- avanzata facoltativa.
-- ============================================================
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  start_location text not null,
  destination text,
  technique text not null check (
    technique in ('traina', 'bolentino', 'spinning', 'jigging', 'drifting')
  ),
  date timestamptz not null,
  start_lat double precision not null,
  start_lng double precision not null,
  dest_lat double precision,
  dest_lng double precision,
  created_at timestamptz not null default now()
);

-- Migrazione per database già esistenti creati prima dell'introduzione
-- della modalità "Spot Singolo" (destination era NOT NULL).
alter table public.trips alter column destination drop not null;
alter table public.trips alter column dest_lat drop not null;
alter table public.trips alter column dest_lng drop not null;

alter table public.trips enable row level security;

-- MVP: policy aperte per permettere l'uso dell'app senza login.
-- Prima di andare in produzione con utenti reali, restringile,
-- ad esempio: using (auth.uid() = user_id).
drop policy if exists "Anyone can insert trips (MVP)" on public.trips;
create policy "Anyone can insert trips (MVP)"
  on public.trips for insert
  with check (true);

drop policy if exists "Anyone can read trips (MVP)" on public.trips;
create policy "Anyone can read trips (MVP)"
  on public.trips for select
  using (true);

-- ============================================================
-- 3. FISHING_REPORTS
-- Colonne richieste: id, trip_id, score, species, recommendations, created_at.
-- Colonne aggiuntive (conditions, zones): sintesi delle condizioni
-- meteo-mare e punteggi campionati lungo la rotta, usati dalla Dashboard
-- e dalla pagina Mappa per colorare le zone.
-- ============================================================
create table if not exists public.fishing_reports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  species jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '{}'::jsonb,
  conditions jsonb not null default '{}'::jsonb,
  zones jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.fishing_reports enable row level security;

drop policy if exists "Anyone can insert fishing reports (MVP)" on public.fishing_reports;
create policy "Anyone can insert fishing reports (MVP)"
  on public.fishing_reports for insert
  with check (true);

drop policy if exists "Anyone can read fishing reports (MVP)" on public.fishing_reports;
create policy "Anyone can read fishing reports (MVP)"
  on public.fishing_reports for select
  using (true);

-- ============================================================
-- 4. FAVORITE_SPOTS
-- Spot salvati tra i "Preferiti" per ricaricare meteo e consigli con un tap.
-- Come per trips/fishing_reports, l'MVP non ha login: gli spot sono
-- associati a un device_id generato lato client (localStorage) invece che
-- a un utente autenticato. Le policy restano aperte (stesso compromesso
-- delle altre tabelle MVP) e il filtro per device_id è applicato lato
-- applicazione nelle query.
-- ============================================================
create table if not exists public.favorite_spots (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  technique text not null default 'bolentino' check (
    technique in ('traina', 'bolentino', 'spinning', 'jigging', 'drifting')
  ),
  created_at timestamptz not null default now()
);

alter table public.favorite_spots enable row level security;

drop policy if exists "Anyone can insert favorite spots (MVP)" on public.favorite_spots;
create policy "Anyone can insert favorite spots (MVP)"
  on public.favorite_spots for insert
  with check (true);

drop policy if exists "Anyone can read favorite spots (MVP)" on public.favorite_spots;
create policy "Anyone can read favorite spots (MVP)"
  on public.favorite_spots for select
  using (true);

drop policy if exists "Anyone can delete favorite spots (MVP)" on public.favorite_spots;
create policy "Anyone can delete favorite spots (MVP)"
  on public.favorite_spots for delete
  using (true);

-- ============================================================
-- Indici utili
-- ============================================================
create index if not exists trips_user_id_idx on public.trips (user_id);
create index if not exists fishing_reports_trip_id_idx on public.fishing_reports (trip_id);
create index if not exists favorite_spots_device_id_idx on public.favorite_spots (device_id);
