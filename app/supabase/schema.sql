-- SafarCo database. Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run again: it only creates what's missing.

-- Admins: people allowed to edit the price list and read feedback.
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;  -- no policies: only the SQL Editor can change it

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Trips saved to an account. Each person sees only their own.
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trips_user_idx on public.trips (user_id, updated_at desc);
alter table public.trips enable row level security;
drop policy if exists "Own trips" on public.trips;
create policy "Own trips" on public.trips for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- App settings, currently the price list (key = 'prices'). Everyone can read; only admins write.
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
drop policy if exists "Anyone can read settings" on public.app_config;
create policy "Anyone can read settings" on public.app_config for select to anon, authenticated using (true);
drop policy if exists "Admins write settings" on public.app_config;
create policy "Admins write settings" on public.app_config for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Feedback from the app. Anyone can send; only admins can read.
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message text not null check (char_length(message) between 1 and 2000),
  contact text check (char_length(contact) <= 200),
  page text check (char_length(page) <= 300),
  user_id uuid default auth.uid()
);
alter table public.feedback enable row level security;
drop policy if exists "Anyone can send feedback" on public.feedback;
create policy "Anyone can send feedback" on public.feedback for insert to anon, authenticated with check (true);
drop policy if exists "Admins read feedback" on public.feedback;
create policy "Admins read feedback" on public.feedback for select to authenticated using (public.is_admin());

-- Reviews of trusted hotels and drivers (same as supabase/reviews.sql).
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author text not null default '' check (char_length(author) <= 60),
  item_kind text not null check (item_kind in ('hotel', 'driver')),
  item_id text not null check (char_length(item_id) between 1 and 40),
  rating int not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 600),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  stayed_on date,
  unique (user_id, item_kind, item_id)
);
alter table public.reviews add column if not exists stayed_on date;
alter table public.reviews enable row level security;
drop policy if exists "Read approved reviews" on public.reviews;
create policy "Read approved reviews" on public.reviews for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists "Write own review" on public.reviews;
create policy "Write own review" on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "Edit own review" on public.reviews;
create policy "Edit own review" on public.reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "Admins moderate reviews" on public.reviews;
create policy "Admins moderate reviews" on public.reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Delete own review" on public.reviews;
create policy "Delete own review" on public.reviews for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Make yourself an admin (use the Google email you sign in with), then run this line:
-- insert into public.admins (email) values ('you@example.com') on conflict do nothing;
-- "Follow our trip": a private link family can open to see the plan and the latest check-ins.
-- Paste into Supabase → SQL Editor → New query → Run. Safe to run again.
-- Only the traveller (signed in) can create, change or delete their links and check-ins. Family
-- read one link through follow_view(id): the id is a long random code, and nobody can list them.
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  expires_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.checkins (
  id bigint generated always as identity primary key,
  follow_id uuid not null references public.follows (id) on delete cascade,
  place text not null check (char_length(place) between 1 and 80),
  lat double precision,
  lon double precision,
  created_at timestamptz not null default now()
);
alter table public.follows enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "Own follow links" on public.follows;
create policy "Own follow links" on public.follows for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Check in on own links" on public.checkins;
create policy "Check in on own links" on public.checkins for insert to authenticated
  with check (exists (select 1 from public.follows f where f.id = follow_id and f.user_id = auth.uid()));
drop policy if exists "Read own check-ins" on public.checkins;
create policy "Read own check-ins" on public.checkins for select to authenticated
  using (exists (select 1 from public.follows f where f.id = follow_id and f.user_id = auth.uid()));

-- One link's plan and its last 10 check-ins. The plan is hidden once the link has expired.
create or replace function public.follow_view(fid uuid) returns json
language sql security definer stable set search_path = public as $$
  select json_build_object(
    'data', case when f.expires_on >= current_date then f.data end,
    'expired', f.expires_on < current_date,
    'checkins', coalesce((select json_agg(c) from (
      select place, lat, lon, created_at from public.checkins where follow_id = f.id order by created_at desc limit 10) c), '[]'::json))
  from public.follows f where f.id = fid;
$$;
revoke all on function public.follow_view(uuid) from public;
grant execute on function public.follow_view(uuid) to anon, authenticated;
