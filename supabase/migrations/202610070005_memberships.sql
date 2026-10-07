create table if not exists public.membership_subscriptions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.membership_subscriptions enable row level security;

drop policy if exists "members can read own subscription" on public.membership_subscriptions;
create policy "members can read own subscription"
  on public.membership_subscriptions for select
  using (auth.uid() = profile_id);

revoke insert, update, delete on public.membership_subscriptions from anon, authenticated;
