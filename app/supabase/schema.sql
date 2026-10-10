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

-- Make yourself an admin (use the Google email you sign in with), then run this line:
-- insert into public.admins (email) values ('you@example.com') on conflict do nothing;
