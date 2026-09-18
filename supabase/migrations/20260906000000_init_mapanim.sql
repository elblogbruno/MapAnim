-- ==============================================================================
-- MapAnim (Route Motion Studio) - Supabase Database Schema & Security Policies
-- Designed according to Supabase Postgres Best Practices
-- ==============================================================================

-- 1. Profiles Table (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles RLS
create policy "Anyone can read profile details"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 2. Automatically create profile on user registration
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Projects Table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Sin título',
  description text,
  aspect_ratio text not null default '16:9',
  duration_seconds numeric not null default 12,
  stops_count integer not null default 0,
  origin_name text,
  destination_name text,
  total_distance_km numeric not null default 0,
  transport_icons text[] not null default array[]::text[],
  style_preset text not null default 'vintageAmericana',
  is_public boolean not null default false,
  share_slug text unique,
  thumbnail_url text,
  project_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- 4. Projects Indexes (Essential for performance)
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_updated_at on public.projects(updated_at desc);
create index if not exists idx_projects_is_public on public.projects(is_public) where is_public = true;
create index if not exists idx_projects_share_slug on public.projects(share_slug) where share_slug is not null;

-- 5. Projects RLS Policies
-- SELECT: Owner can see their own projects, anyone can see public projects
create policy "Users can view their own projects"
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Anyone can view public projects"
  on public.projects for select
  using (is_public = true);

-- INSERT: Only authenticated users can create projects for themselves
create policy "Users can create their own projects"
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- UPDATE: Owner can update their own projects
create policy "Users can update their own projects"
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- DELETE: Owner can delete their own projects
create policy "Users can delete their own projects"
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 6. Storage Bucket for Assets (photos, custom vehicles, audio, thumbnails)
insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', true)
on conflict (id) do nothing;

create policy "Public can view project assets"
  on storage.objects for select
  using (bucket_id = 'project-assets');

create policy "Authenticated users can upload project assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-assets' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "Authenticated users can update their assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-assets' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "Authenticated users can delete their assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-assets' and (select auth.uid())::text = (storage.foldername(name))[1]);
