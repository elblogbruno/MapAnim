-- ==============================================================================
-- MapAnim - Migration: Likes, Views, Realtime, and Media Storage
-- Adheres strictly to Supabase Postgres Best Practices
-- ==============================================================================

-- 1. Extend projects table with metrics columns
alter table public.projects
  add column if not exists likes_count integer not null default 0,
  add column if not exists views_count integer not null default 0,
  add column if not exists forks_count integer not null default 0;

-- Indexes for discovery & trending
create index if not exists idx_projects_likes_count on public.projects(likes_count desc);
create index if not exists idx_projects_views_count on public.projects(views_count desc);

-- 2. Project Likes Table
create table if not exists public.project_likes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_project_user_like unique (project_id, user_id)
);

alter table public.project_likes enable row level security;

-- Performance indexes for FK lookups and RLS
create index if not exists idx_project_likes_project_id on public.project_likes(project_id);
create index if not exists idx_project_likes_user_id on public.project_likes(user_id);

-- RLS Policies for project_likes
create policy Anyone can read project likes
  on public.project_likes for select
  using (true);

create policy Authenticated users can like projects
  on public.project_likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy Users can unlike their own likes
  on public.project_likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 3. Automatic Trigger to update projects.likes_count
create or replace function public.update_project_likes_count()
returns trigger
language plpgsql
security definer set search_path = ''
as 
begin
  if tg_op = 'INSERT' then
    update public.projects
    set likes_count = likes_count + 1
    where id = new.project_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.projects
    set likes_count = greatest(0, likes_count - 1)
    where id = old.project_id;
    return old;
  end if;
  return null;
end;
;

drop trigger if exists on_project_like_change on public.project_likes;
create trigger on_project_like_change
  after insert or delete on public.project_likes
  for each row execute function public.update_project_likes_count();

-- 4. RPC to atomically increment project views
create or replace function public.increment_project_views(target_project_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as 
begin
  update public.projects
  set views_count = views_count + 1
  where id = target_project_id;
end;
;

grant execute on function public.increment_project_views(uuid) to anon, authenticated;

-- 5. RPC to atomically increment forks count
create or replace function public.increment_project_forks(target_project_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as 
begin
  update public.projects
  set forks_count = forks_count + 1
  where id = target_project_id;
end;
;

grant execute on function public.increment_project_forks(uuid) to anon, authenticated;

-- 6. Add to Realtime Publication (if publication exists)
do 
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.projects;
    alter publication supabase_realtime add table public.project_likes;
  end if;
exception
  when duplicate_object then null;
end ;
