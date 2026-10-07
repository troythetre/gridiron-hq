import { createClient } from "@/lib/supabase/server";
import type { PlayerRow, InjuryRow, WaiverPickRow, NewsItemRow, FantasyVideoRow } from "@/lib/types";

export async function getPlayers(): Promise<PlayerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("overall_rank", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getPlayerById(id: number): Promise<PlayerRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getInjuries(): Promise<InjuryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("injuries").select("*").order("id");
  if (error) throw error;
  return data ?? [];
}

export async function getWaiverPicks(): Promise<WaiverPickRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("waiver_picks")
    .select("*")
    .order("pct_rostered_est", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getNews(limit = 1000): Promise<NewsItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_items")
    .select("*")
    .order("item_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

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
