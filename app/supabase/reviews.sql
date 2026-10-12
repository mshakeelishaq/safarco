-- Reviews of SafarCo's trusted hotels and drivers. Paste into Supabase → SQL Editor → New query → Run.
-- Safe to run again. Signed-in travellers write one review per hotel or driver (writing again
-- replaces it); nobody sees it until an admin approves it at /admin.
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
-- Added later: the date of the stay or jeep trip being reviewed.
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
