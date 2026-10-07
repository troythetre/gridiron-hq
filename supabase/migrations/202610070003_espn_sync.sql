-- Read-only ESPN Fantasy roster sync. Cookie material is AES-256-GCM encrypted
-- by the server before it reaches this table; keep these columns owner-only.
create table if not exists public.espn_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  espn_league_id text not null,
  season int not null,
  team_id text,
  cookie_ciphertext text not null,
  cookie_iv text not null,
  cookie_tag text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, espn_league_id)
);

create table if not exists public.espn_rosters (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  espn_league_id text not null,
  season int not null,
  league_name text not null,
  team_name text not null,
  wins int not null default 0,
  losses int not null default 0,
  ties int not null default 0,
  roster_json jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now(),
  unique (profile_id, espn_league_id)
);

create index if not exists idx_espn_rosters_profile on public.espn_rosters(profile_id);
alter table public.espn_links enable row level security;
alter table public.espn_rosters enable row level security;

create policy "espn_links_own" on public.espn_links for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "espn_rosters_own" on public.espn_rosters for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
