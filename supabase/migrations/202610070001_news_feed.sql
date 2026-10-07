alter table public.news_items
  add column if not exists article_url text,
  add column if not exists source_url text,
  add column if not exists topics text[] not null default '{}';

create unique index if not exists idx_news_items_article_url
  on public.news_items (article_url);
create index if not exists idx_news_items_topics on public.news_items using gin (topics);
