-- Fantasy Platform database schema (Postgres / Supabase)
-- Applied via Supabase migration "initial_schema". Kept here in the repo as the
-- source of truth / history, since Supabase migrations are managed outside git.

-- ============================================================================
-- Reference data tables (global, read-only to end users, seeded by the app
-- maintainer / refresh script - rankings, injuries, waiver pickups, news)
-- ============================================================================
create table if not exists public.players (
  id bigint generated always as identity primary key,
  name text not null,
  pos text not null check (pos in ('QB','RB','WR','TE','K','DST')),
  team text not null,
  wk1_pts numeric,
  wk2_pts numeric,
  total_pts numeric not null default 0,
  games int not null default 0,
  avg_pts numeric not null default 0,
  pos_rank int,
  overall_rank int,
  updated_at timestamptz not null default now(),
  unique (name, team)
);

create table if not exists public.injuries (
  id bigint generated always as identity primary key,
  name text not null,
  pos text,
  team text,
  injury text not null,
  status text not null check (status in ('OUT','DOUBTFUL','QUESTIONABLE','MONITOR')),
  note text,
  source text,
  updated_at timestamptz not null default now()
);

create table if not exists public.waiver_picks (
  id bigint generated always as identity primary key,
  name text not null,
  pos text,
  team text,
  pct_rostered_est numeric,
  note text,
  source text,
  updated_at timestamptz not null default now()
);

create table if not exists public.news_items (
  id bigint generated always as identity primary key,
  headline text not null,
  body text,
  item_date date,
  source text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- User / league / roster tables
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scoring_type text not null default 'half_ppr',
  num_teams int not null default 10,
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team_name text not null,
  created_at timestamptz not null default now(),
  unique (league_id, profile_id)
);

create table if not exists public.roster_slots (
  id uuid primary key default gen_random_uuid(),
  league_member_id uuid not null references public.league_members(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  slot text not null check (slot in ('QB','RB1','RB2','WR1','WR2','TE','FLEX1','FLEX2','DST','K','BE')),
  is_starter boolean not null default true,
  added_at timestamptz not null default now(),
  unique (league_member_id, slot)
);

create index if not exists idx_league_members_league on public.league_members(league_id);
create index if not exists idx_league_members_profile on public.league_members(profile_id);
create index if not exists idx_roster_slots_member on public.roster_slots(league_member_id);
create index if not exists idx_players_pos on public.players(pos);

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.players enable row level security;
alter table public.injuries enable row level security;
alter table public.waiver_picks enable row level security;
alter table public.news_items enable row level security;
alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.roster_slots enable row level security;

-- Reference data: readable by anyone, including anonymous visitors (demo-friendly).
-- No insert/update/delete policy is defined for these, so only the service role
-- (used by the refresh script) can write to them - clients never can.
create policy "players_public_read" on public.players for select using (true);
create policy "injuries_public_read" on public.injuries for select using (true);
create policy "waiver_public_read" on public.waiver_picks for select using (true);
create policy "news_public_read" on public.news_items for select using (true);

-- Profiles: anyone signed in can see display names (needed for league rosters/standings);
-- a user may only insert/update their own profile row.
create policy "profiles_read_all" on public.profiles for select to authenticated using (true);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid());

-- Leagues: any signed-in user can browse leagues (to join by invite code) and create one;
-- only the creator can modify/delete it.
create policy "leagues_read_all" on public.leagues for select to authenticated using (true);
create policy "leagues_insert_own" on public.leagues for insert to authenticated with check (created_by = auth.uid());
create policy "leagues_update_own" on public.leagues for update to authenticated using (created_by = auth.uid());
create policy "leagues_delete_own" on public.leagues for delete to authenticated using (created_by = auth.uid());

-- League members: any signed-in user can see membership rows (standings/rosters are
-- league-visible by design); a user can only create/update/delete their OWN membership.
create policy "league_members_read_all" on public.league_members for select to authenticated using (true);
create policy "league_members_insert_own" on public.league_members for insert to authenticated with check (profile_id = auth.uid());
create policy "league_members_update_own" on public.league_members for update to authenticated using (profile_id = auth.uid());
create policy "league_members_delete_own" on public.league_members for delete to authenticated using (profile_id = auth.uid());

-- Roster slots: visible to any signed-in user (so opponents' rosters are viewable, same as
-- a real fantasy platform); a user can only write roster slots under their OWN league_member row.
create policy "roster_slots_read_all" on public.roster_slots for select to authenticated using (true);
create policy "roster_slots_write_own" on public.roster_slots for all to authenticated
  using (
    exists (
      select 1 from public.league_members lm
      where lm.id = roster_slots.league_member_id and lm.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.league_members lm
      where lm.id = roster_slots.league_member_id and lm.profile_id = auth.uid()
    )
  );

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
