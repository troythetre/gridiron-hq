create table if not exists public.saved_parlays (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null default 'NFL' check (sport in ('NFL', 'CFB')),
  legs jsonb not null,
  stake numeric(10,2) not null check (stake > 0),
  combined_odds_decimal numeric(10,4),
  potential_payout numeric(10,2),
  status text not null default 'pending' check (status in ('pending', 'won', 'lost', 'void')),
  actual_payout numeric(10,2),
  placed_at timestamptz not null default now(),
  settled_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_parlays_profile on public.saved_parlays(profile_id, placed_at desc);
create index if not exists idx_saved_parlays_profile_status on public.saved_parlays(profile_id, status);

alter table public.saved_parlays enable row level security;

create policy "saved_parlays_read_own" on public.saved_parlays
  for select to authenticated using (profile_id = auth.uid());
create policy "saved_parlays_insert_own" on public.saved_parlays
  for insert to authenticated with check (profile_id = auth.uid());
create policy "saved_parlays_update_own" on public.saved_parlays
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "saved_parlays_delete_own" on public.saved_parlays
  for delete to authenticated using (profile_id = auth.uid());
