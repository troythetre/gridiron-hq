-- Add public/private visibility flag to profiles
alter table public.profiles
  add column if not exists betting_profile_public boolean not null default false;

-- Table to persist a user's favorite / target / observed player lists server-side
create table if not exists public.player_list_entries (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  list_type text not null check (list_type in ('favorite', 'target', 'observed')),
  player_id bigint not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, list_type, player_id)
);

alter table public.player_list_entries enable row level security;

-- Owner can read their own entries
create policy player_list_entries_read_own
  on public.player_list_entries
  for select
  to authenticated
  using (profile_id = auth.uid());

-- Owner can insert their own entries
create policy player_list_entries_insert_own
  on public.player_list_entries
  for insert
  to authenticated
  with check (profile_id = auth.uid());

-- Owner can delete their own entries
create policy player_list_entries_delete_own
  on public.player_list_entries
  for delete
  to authenticated
  using (profile_id = auth.uid());

-- Anyone (including anonymous visitors) can read entries belonging to a profile
-- that has opted in to a public betting profile
create policy player_list_entries_read_public
  on public.player_list_entries
  for select
  to public
  using (
    exists (
      select 1 from public.profiles p
      where p.id = player_list_entries.profile_id
        and p.betting_profile_public = true
    )
  );

-- Allow anonymous/public read of a profile's display_name when that profile
-- has opted in to a public betting profile (additive to existing
-- authenticated-only profiles_read_all policy; permissive policies OR together)
create policy profiles_read_public_betting_profile
  on public.profiles
  for select
  to anon
  using (betting_profile_public = true);
