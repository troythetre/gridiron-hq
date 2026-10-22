import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupabaseClient } from "@/lib/supabase/public";
import type { PlayerRow, InjuryRow, WaiverPickRow, NewsItemRow, FantasyVideoRow } from "@/lib/types";

/**
 * players/injuries/news_items are public-read tables (verified against
 * pg_policies - no auth required), but they were being queried through the
 * cookie-aware Supabase client (src/lib/supabase/server.ts), which calls
 * cookies() from next/headers. That makes Next treat the whole request as
 * dynamic and skip its fetch cache entirely, so every navigation - in
 * particular every tab switch on /dashboard/player-analysis, each of which
 * calls getPlayers() at minimum - re-ran the query against Supabase from
 * scratch with no caching at all. Routed through the cookie-less public
 * client and wrapped in unstable_cache instead: a short revalidate window
 * means repeated navigations within it are served from cache instead of
 * round-tripping to Supabase every time.
 */
export const getPlayers = unstable_cache(
  async (): Promise<PlayerRow[]> => {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("overall_rank", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  ["players-list"],
  { revalidate: 30, tags: ["players"] },
);

export const getPlayerById = unstable_cache(
  async (id: number): Promise<PlayerRow | null> => {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
  ["player-by-id"],
  { revalidate: 30, tags: ["players"] },
);

export const getInjuries = unstable_cache(
  async (): Promise<InjuryRow[]> => {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase.from("injuries").select("*").order("id");
    if (error) throw error;
    return data ?? [];
  },
  ["injuries-list"],
  { revalidate: 30, tags: ["injuries"] },
);

export async function getWaiverPicks(): Promise<WaiverPickRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waiver_picks")
    .select("*")
    .order("pct_rostered_est", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export const getNews = unstable_cache(
  async (limit = 1000): Promise<NewsItemRow[]> => {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase
      .from("news_items")
      .select("*")
      .order("item_date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
  ["news-list"],
  { revalidate: 30, tags: ["news"] },
);

export async function getFantasyVideos(): Promise<FantasyVideoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fantasy_videos")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(60);
  // Video ingestion is optional until the community/feed migration is applied.
  // Supabase/PostgREST use different error codes for a missing table vs a stale
  // schema cache; neither should take down the main dashboard.
  if (error?.code === "42P01" || error?.code === "PGRST205") return [];
  if (error) throw error;
  return data ?? [];
}

/** Injuries indexed by player name, for quick lookup when rendering player lists. */
export function injuriesByName(injuries: InjuryRow[]): Map<string, InjuryRow> {
  return new Map(injuries.map((i) => [i.name, i]));
}
