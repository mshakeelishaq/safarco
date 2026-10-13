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
