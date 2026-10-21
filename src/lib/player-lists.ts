import { createClient } from "@/lib/supabase/server";
import type { PlayerRow } from "@/lib/types";

// Server-only: this file imports the Supabase server client (next/headers),
// so it must never be imported from a "use client" component. The client-side
// localStorage hooks (player-favorites.ts, player-targets.ts, player-watch.ts)
// stay the fast, per-browser source of truth for the UI; this file is the
// server-side mirror that powers the account page's "betting profile" section
// and the public-facing profile page.

export type PlayerListType = "favorite" | "target" | "observed";

export const PLAYER_LIST_TYPES: PlayerListType[] = ["favorite", "target", "observed"];

type PlayerListRow = {
  list_type: PlayerListType;
  players: {
    id: number;
    name: string;
    pos: PlayerRow["pos"];
    team: string;
    avg_pts: number | null;
    total_pts: number | null;
  } | null;
};

function toPlayerRow(player: NonNullable<PlayerListRow["players"]>): PlayerRow {
  return {
    id: player.id,
    name: player.name,
    pos: player.pos,
    team: player.team,
    wk1_pts: null,
    wk2_pts: null,
    total_pts: player.total_pts ?? 0,
    games: 0,
    avg_pts: player.avg_pts ?? 0,
    pos_rank: null,
    overall_rank: null,
  };
}

function groupByListType(rows: PlayerListRow[]): Record<PlayerListType, PlayerRow[]> {
  const grouped: Record<PlayerListType, PlayerRow[]> = { favorite: [], target: [], observed: [] };
  for (const row of rows) {
    if (!row.players) continue;
    grouped[row.list_type].push(toPlayerRow(row.players));
  }
  return grouped;
}

/** The signed-in bettor's own favorite/target/observed lists, with player detail joined in. */
export async function getPlayerListEntries(profileId: string): Promise<Record<PlayerListType, PlayerRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_list_entries")
    .select("list_type, players ( id, name, pos, team, avg_pts, total_pts )")
    .eq("profile_id", profileId);
  // Tolerate the table not existing yet, same pattern as getSavedParlays().
  if (error?.code === "PGRST205" || error?.code === "42P01") return { favorite: [], target: [], observed: [] };
  if (error) throw error;
  return groupByListType((data ?? []) as unknown as PlayerListRow[]);
}

/** Whether the signed-in bettor's betting profile is currently public. */
export async function getBettingProfileVisibility(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("betting_profile_public")
    .eq("id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data?.betting_profile_public ?? false;
}

export type PublicBettingProfile = {
  displayName: string;
  lists: Record<PlayerListType, PlayerRow[]>;
};

/**
 * Read-only lookup for the public profile page. Relies entirely on RLS: the
 * anon-role policies on `profiles` and `player_list_entries` only return rows
 * when `betting_profile_public = true`, so an anonymous visitor querying a
 * private or nonexistent profile id gets back null here with no extra checks.
 */
export async function getPublicBettingProfile(profileId: string): Promise<PublicBettingProfile | null> {
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", profileId)
    .maybeSingle();
  if (profileError?.code === "PGRST205" || profileError?.code === "42P01") return null;
  if (profileError) throw profileError;
  if (!profile) return null;

  const { data, error } = await supabase
    .from("player_list_entries")
    .select("list_type, players ( id, name, pos, team, avg_pts, total_pts )")
    .eq("profile_id", profileId);
  if (error?.code === "PGRST205" || error?.code === "42P01") {
    return { displayName: profile.display_name ?? "Bettor", lists: { favorite: [], target: [], observed: [] } };
  }
  if (error) throw error;

  return {
    displayName: profile.display_name ?? "Bettor",
    lists: groupByListType((data ?? []) as unknown as PlayerListRow[]),
  };
}
