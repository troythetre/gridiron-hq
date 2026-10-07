create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.forum_post_owners (
  post_id uuid primary key references public.forum_posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade
);

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.forum_reply_owners (
  reply_id uuid primary key references public.forum_replies(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade
);

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists idx_forum_posts_created on public.forum_posts(created_at desc);
create index if not exists idx_forum_replies_post on public.forum_replies(post_id, created_at);
create index if not exists idx_user_follows_following on public.user_follows(following_id);
create index if not exists idx_direct_messages_participants on public.direct_messages(sender_id, recipient_id, created_at desc);

alter table public.forum_posts enable row level security;
alter table public.forum_post_owners enable row level security;
alter table public.forum_replies enable row level security;
alter table public.forum_reply_owners enable row level security;
alter table public.user_follows enable row level security;
alter table public.direct_messages enable row level security;

create policy "forum_posts_read_authenticated" on public.forum_posts
  for select to authenticated using (true);
create policy "forum_post_owners_read_own" on public.forum_post_owners
  for select to authenticated using (owner_id = auth.uid());
create policy "forum_replies_read_authenticated" on public.forum_replies
  for select to authenticated using (true);
create policy "forum_reply_owners_read_own" on public.forum_reply_owners
  for select to authenticated using (owner_id = auth.uid());

create policy "user_follows_read_own" on public.user_follows
  for select to authenticated using (follower_id = auth.uid() or following_id = auth.uid());
create policy "user_follows_insert_own" on public.user_follows
  for insert to authenticated with check (follower_id = auth.uid() and follower_id <> following_id);
create policy "user_follows_delete_own" on public.user_follows
  for delete to authenticated using (follower_id = auth.uid());

create policy "direct_messages_read_participant" on public.direct_messages
  for select to authenticated using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy "direct_messages_send_mutual_follow" on public.direct_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and sender_id <> recipient_id
    and exists (
      select 1 from public.user_follows f
      where f.follower_id = sender_id and f.following_id = recipient_id
    )
    and exists (
      select 1 from public.user_follows f
      where f.follower_id = recipient_id and f.following_id = sender_id
    )
  );

create or replace function public.create_anonymous_forum_post(p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_post_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to post.'; end if;
  if char_length(btrim(p_body)) not between 1 and 4000 then raise exception 'Post must be between 1 and 4000 characters.'; end if;
  insert into public.forum_posts (body) values (btrim(p_body)) returning id into new_post_id;
  insert into public.forum_post_owners (post_id, owner_id) values (new_post_id, auth.uid());
  return new_post_id;
end;
$$;

create or replace function public.create_anonymous_forum_reply(p_post_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_reply_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to reply.'; end if;
  if char_length(btrim(p_body)) not between 1 and 2000 then raise exception 'Reply must be between 1 and 2000 characters.'; end if;
  if not exists (select 1 from public.forum_posts p where p.id = p_post_id) then raise exception 'Post not found.'; end if;
  insert into public.forum_replies (post_id, body) values (p_post_id, btrim(p_body)) returning id into new_reply_id;
  insert into public.forum_reply_owners (reply_id, owner_id) values (new_reply_id, auth.uid());
  return new_reply_id;
end;
$$;

revoke all on function public.create_anonymous_forum_post(text) from public;
revoke all on function public.create_anonymous_forum_reply(uuid, text) from public;
grant execute on function public.create_anonymous_forum_post(text) to authenticated;
grant execute on function public.create_anonymous_forum_reply(uuid, text) to authenticated;

create table if not exists public.fantasy_videos (
  video_id text primary key check (video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  title text not null,
  description text,
  channel_title text not null,
  published_at timestamptz not null,
  thumbnail_url text not null,
  watch_url text not null,
  topics text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists idx_fantasy_videos_published on public.fantasy_videos(published_at desc);
create index if not exists idx_fantasy_videos_topics on public.fantasy_videos using gin(topics);
alter table public.fantasy_videos enable row level security;
create policy "fantasy_videos_read_authenticated" on public.fantasy_videos
  for select to authenticated using (true);
