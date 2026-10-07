alter table public.news_items
  add column if not exists image_url text;
