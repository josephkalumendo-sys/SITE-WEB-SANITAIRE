create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  article_url text not null check (article_url ~ '^https://'),
  article_title text not null,
  source text,
  publisher text,
  category text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, article_url)
);

alter table public.favorites
  add column if not exists article_title text not null default '',
  add column if not exists source text,
  add column if not exists publisher text,
  add column if not exists category text,
  add column if not exists published_at timestamptz;

alter table public.favorites enable row level security;

drop policy if exists "Users can read their own favorites" on public.favorites;
create policy "Users can read their own favorites"
  on public.favorites for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own favorites" on public.favorites;
create policy "Users can add their own favorites"
  on public.favorites for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their own favorites" on public.favorites;
create policy "Users can remove their own favorites"
  on public.favorites for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.favorites from anon;
grant select, insert, delete on table public.favorites to authenticated;
