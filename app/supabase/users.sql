-- Who has signed up, for the admin's Users section. Run once in Supabase → SQL Editor → New query → Run.
-- People's accounts live in auth.users, which the app can't read directly. This function shows a short
-- summary of each one, and only to admins (anyone else gets an error). Needs reviews.sql and food.sql first.
create or replace function public.admin_users()
returns table (id uuid, email text, name text, provider text, created_at timestamptz, last_sign_in_at timestamptz, trips bigint, reviews bigint, tips bigint, is_admin boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'Only admins can see users'; end if;
  return query
  select u.id, u.email::text,
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')::text,
    coalesce(u.raw_app_meta_data ->> 'provider', '')::text,
    u.created_at, u.last_sign_in_at,
    (select count(*) from public.trips t where t.user_id = u.id),
    (select count(*) from public.reviews r where r.user_id = u.id),
    (select count(*) from public.food_tips f where f.user_id = u.id),
    exists (select 1 from public.admins a where lower(a.email) = lower(u.email))
  from auth.users u
  order by u.created_at desc
  limit 5000;
end $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;
