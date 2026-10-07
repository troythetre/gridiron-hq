import { createClient } from "@/lib/supabase/server";
import type { PlayerRow, InjuryRow, WaiverPickRow, NewsItemRow } from "@/lib/types";

export async function getPlayers(): Promise<PlayerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("overall_rank", { ascending: true });
  if (error) throw error;
  return data ?? [];
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

export async function getNews(): Promise<NewsItemRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_items")
    .select("*")
    .order("item_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Injuries indexed by player name, for quick lookup when rendering player lists. */
export function injuriesByName(injuries: InjuryRow[]): Map<string, InjuryRow> {
  return new Map(injuries.map((i) => [i.name, i]));
}
