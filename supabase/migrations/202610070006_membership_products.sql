create table if not exists public.membership_subscriptions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_key text not null default 'gridiron_plus',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.membership_subscriptions
  add column if not exists product_key text not null default 'gridiron_plus';

alter table public.membership_subscriptions
  alter column product_key set default 'gridiron_plus',
  alter column product_key set not null;

alter table public.membership_subscriptions
  drop constraint if exists membership_subscriptions_pkey,
  drop constraint if exists membership_subscriptions_stripe_customer_id_key;

alter table public.membership_subscriptions
  add constraint membership_subscriptions_pkey primary key (profile_id, product_key);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'membership_subscriptions_product_key_check'
      and conrelid = 'public.membership_subscriptions'::regclass
  ) then
    alter table public.membership_subscriptions
      add constraint membership_subscriptions_product_key_check
      check (product_key in ('gridiron_plus', 'nfl_betting', 'cfb_betting'));
  end if;
end $$;

alter table public.membership_subscriptions enable row level security;

drop policy if exists "members can read own subscription" on public.membership_subscriptions;
create policy "members can read own subscription"
  on public.membership_subscriptions for select to authenticated
  using (auth.uid() = profile_id);

revoke insert, update, delete on public.membership_subscriptions from anon, authenticated;

notify pgrst, 'reload schema';
