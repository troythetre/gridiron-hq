-- "Preferred sportsbook" tagging - NOT real account linking.
--
-- There is no public API offered by FanDuel, DraftKings, BetMGM, Caesars,
-- or any other major sportsbook for a third-party app to sync a user's
-- real betting account (balance, bet history, etc). Doing that would
-- require either scraping with the user's real login credentials (most
-- sportsbooks' terms of service explicitly prohibit automated/scripted
-- access to personal accounts) or a paid partner integration (e.g.
-- SharpSports), which is out of scope here. This table instead lets a
-- user mark which sportsbooks are theirs so the UI can highlight/filter
-- for "my books" - no credentials are stored, nothing is synced.
create table if not exists public.sportsbook_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sportsbook_id text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (profile_id, sportsbook_id)
);

create index if not exists idx_sportsbook_links_profile on public.sportsbook_links(profile_id);

alter table public.sportsbook_links enable row level security;

create policy "sportsbook_links_read_own" on public.sportsbook_links
  for select to authenticated using (profile_id = auth.uid());
create policy "sportsbook_links_insert_own" on public.sportsbook_links
  for insert to authenticated with check (profile_id = auth.uid());
create policy "sportsbook_links_delete_own" on public.sportsbook_links
  for delete to authenticated using (profile_id = auth.uid());
