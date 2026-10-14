-- Places to eat that travellers suggest. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run again. Signed-in travellers suggest a place; nobody sees it until an admin approves it at /admin.
create table if not exists public.food_tips (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author text not null default '' check (char_length(author) <= 60),
  dest text not null check (char_length(dest) between 1 and 40),
  name text not null check (char_length(name) between 2 and 80),
  dish text not null default '' check (char_length(dish) <= 80),
  note text not null default '' check (char_length(note) <= 300),
  rating int check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden'))
);
alter table public.food_tips enable row level security;
drop policy if exists "Read approved food tips" on public.food_tips;
create policy "Read approved food tips" on public.food_tips for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists "Suggest a place to eat" on public.food_tips;
create policy "Suggest a place to eat" on public.food_tips for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "Admins moderate food tips" on public.food_tips;
create policy "Admins moderate food tips" on public.food_tips for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Delete own food tip" on public.food_tips;
create policy "Delete own food tip" on public.food_tips for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
