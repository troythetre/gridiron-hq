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
  article_url text,
  source_url text,
  topics text[] not null default '{}',
  created_at timestamptz not null default now()
);

create unique index if not exists idx_news_items_article_url
  on public.news_items (article_url);
create index if not exists idx_news_items_topics on public.news_items using gin (topics);

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

-- ============================================================================
-- Sleeper sync (read-only reference data pulled from the public Sleeper API).
-- Applied via migration "sleeper_sync_and_trades".
-- ============================================================================
create table if not exists public.sleeper_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  sleeper_username text not null,
  sleeper_user_id text not null,
  avatar text,
  created_at timestamptz not null default now()
);

create table if not exists public.sleeper_rosters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sleeper_league_id text not null,
  league_name text not null,
  team_name text,
  wins int not null default 0,
  losses int not null default 0,
  ties int not null default 0,
  roster_json jsonb not null default '[]'::jsonb, -- [{sleeper_player_id, name, pos, team}]
  synced_at timestamptz not null default now(),
  unique (profile_id, sleeper_league_id)
);

create index if not exists idx_sleeper_rosters_profile on public.sleeper_rosters(profile_id);

alter table public.sleeper_links enable row level security;
alter table public.sleeper_rosters enable row level security;

-- Private to the owner only - this is personal sync data, not league-visible.
create policy "sleeper_links_own" on public.sleeper_links for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "sleeper_rosters_own" on public.sleeper_rosters for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ============================================================================
-- Trade system (native leagues only - operates on roster_slots/players, the
-- same rows the start/sit and roster-management features already use).
-- ============================================================================
create table if not exists public.trade_block (
  id uuid primary key default gen_random_uuid(),
  league_member_id uuid not null references public.league_members(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (league_member_id, player_id)
);

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  proposer_member_id uuid not null references public.league_members(id) on delete cascade,
  recipient_member_id uuid not null references public.league_members(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (proposer_member_id <> recipient_member_id)
);

create table if not exists public.trade_offer_items (
  id uuid primary key default gen_random_uuid(),
  trade_offer_id uuid not null references public.trade_offers(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  from_member_id uuid not null references public.league_members(id) on delete cascade,
  unique (trade_offer_id, player_id)
);

create index if not exists idx_trade_block_member on public.trade_block(league_member_id);
create index if not exists idx_trade_offers_league on public.trade_offers(league_id);
create index if not exists idx_trade_offers_proposer on public.trade_offers(proposer_member_id);
create index if not exists idx_trade_offers_recipient on public.trade_offers(recipient_member_id);
create index if not exists idx_trade_offer_items_offer on public.trade_offer_items(trade_offer_id);

alter table public.trade_block enable row level security;
alter table public.trade_offers enable row level security;
alter table public.trade_offer_items enable row level security;

-- Trade block: league-visible (like rosters), writable only by the owning member.
create policy "trade_block_read_all" on public.trade_block for select to authenticated using (true);
create policy "trade_block_write_own" on public.trade_block for all to authenticated
  using (
    exists (
      select 1 from public.league_members lm
      where lm.id = trade_block.league_member_id and lm.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.league_members lm
      where lm.id = trade_block.league_member_id and lm.profile_id = auth.uid()
    )
  );

-- Trade offers: visible/updatable only to the two members involved (proposer or
-- recipient). Insert requires the caller to BE the proposer. Status-transition
-- correctness (only the recipient accepts/rejects, only the proposer cancels,
-- only while PENDING) is enforced in the server action layer, not in RLS.
create policy "trade_offers_read_own" on public.trade_offers for select to authenticated using (
  exists (
    select 1 from public.league_members lm
    where lm.profile_id = auth.uid()
      and lm.id in (trade_offers.proposer_member_id, trade_offers.recipient_member_id)
  )
);
create policy "trade_offers_insert_as_proposer" on public.trade_offers for insert to authenticated with check (
  exists (
    select 1 from public.league_members lm
    where lm.id = trade_offers.proposer_member_id and lm.profile_id = auth.uid()
  )
);
create policy "trade_offers_update_own" on public.trade_offers for update to authenticated using (
  exists (
    select 1 from public.league_members lm
    where lm.profile_id = auth.uid()
      and lm.id in (trade_offers.proposer_member_id, trade_offers.recipient_member_id)
  )
);

-- Trade offer items: visible/insertable only alongside a trade offer the caller can see.
create policy "trade_offer_items_read_own" on public.trade_offer_items for select to authenticated using (
  exists (
    select 1 from public.trade_offers t
    join public.league_members lm on lm.id in (t.proposer_member_id, t.recipient_member_id)
    where t.id = trade_offer_items.trade_offer_id and lm.profile_id = auth.uid()
  )
);
create policy "trade_offer_items_insert_as_proposer" on public.trade_offer_items for insert to authenticated with check (
  exists (
    select 1 from public.trade_offers t
    join public.league_members lm on lm.id = t.proposer_member_id
    where t.id = trade_offer_items.trade_offer_id and lm.profile_id = auth.uid()
  )
);
