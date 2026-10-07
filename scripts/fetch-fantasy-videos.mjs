const youtubeApiKey = process.env.YOUTUBE_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!youtubeApiKey || !supabaseUrl || !serviceKey) {
  throw new Error("Set YOUTUBE_API_KEY, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY before running the video importer.");
}

const search = new URL("https://www.googleapis.com/youtube/v3/search");
search.search = new URLSearchParams({
  part: "snippet",
  type: "video",
  maxResults: "50",
  order: "date",
  safeSearch: "moderate",
  regionCode: "US",
  relevanceLanguage: "en",
  publishedAfter: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  q: "NFL fantasy football PPR half PPR dynasty start sit waiver",
  key: youtubeApiKey,
}).toString();

const response = await fetch(search, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`YouTube search failed: HTTP ${response.status} ${await response.text()}`);
const result = await response.json();
const videos = (result.items ?? []).flatMap((item) => {
  const id = item.id?.videoId;
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return [];
  const title = String(item.snippet?.title ?? "").slice(0, 300);
  const description = String(item.snippet?.description ?? "").slice(0, 1000);
  const text = `${title} ${description}`.toLowerCase();
  const topics = ["fantasy"];
  if (/\bppr\b|points per reception/.test(text)) topics.push("ppr");
  if (/half[ -]?ppr/.test(text)) topics.push("half_ppr");
  if (/dynasty|rookie draft|devy/.test(text)) topics.push("dynasty");
  if (/start[ /-]?sit|lineup|who should i start/.test(text)) topics.push("start_sit");
  if (/waiver|pickup|add and drop/.test(text)) topics.push("waiver");
  return [{
    video_id: id,
    title,
    description,
    channel_title: String(item.snippet?.channelTitle ?? "YouTube creator").slice(0, 200),
    published_at: item.snippet?.publishedAt ?? new Date().toISOString(),
    thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    watch_url: `https://www.youtube.com/watch?v=${id}`,
    topics: [...new Set(topics)],
  }];
});

const baseUrl = supabaseUrl.replace(/\/$/, "");
if (videos.length) {
  const upsert = await fetch(`${baseUrl}/rest/v1/fantasy_videos?on_conflict=video_id`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(videos),
  });
  if (!upsert.ok) throw new Error(`Supabase video upsert failed: HTTP ${upsert.status} ${await upsert.text()}`);
}

const cutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
const cleanupQuery = new URLSearchParams({ published_at: `lt.${cutoff}` });
const cleanup = await fetch(`${baseUrl}/rest/v1/fantasy_videos?${cleanupQuery}`, {
  method: "DELETE",
  headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
});
if (!cleanup.ok) throw new Error(`Supabase video cleanup failed: HTTP ${cleanup.status} ${await cleanup.text()}`);
console.log(`Saved ${videos.length} recent fantasy videos; removed videos older than 45 days.`);
