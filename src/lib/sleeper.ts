/**
 * Sleeper Fantasy API client.
 *
 * Sleeper's API is free and public - no API key or OAuth required, just plain
 * GET requests. Docs: https://docs.sleeper.com/
 *
 * Sync is one-directional and read-only: we pull a user's Sleeper roster in so
 * it shows up alongside their native Gridiron HQ team, cross-referenced against
 * our own rankings/injury data. We never write anything back to Sleeper, and a
 * synced roster is reference-only - trades and the trade block only operate on
 * leagues created natively in Gridiron HQ (see trade.ts), since Sleeper's API
 * has no endpoint for us to action a real trade through anyway.
 */

const BASE_URL = "https://api.sleeper.app/v1";

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  status: string;
  settings?: {
    playoff_teams?: number;
    playoff_week_start?: number;
  };
}

export interface SleeperRosterApi {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
  };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number | null;
  points?: number | null;
}

export interface SleeperNflState {
  week: number;
  season: string;
  season_type: string;
}

export interface SleeperLeagueUser {
  user_id: string;
  display_name: string;
  metadata?: { team_name?: string };
}

export interface SleeperPlayerInfo {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
}

export type SleeperPlayerDict = Record<string, SleeperPlayerInfo>;

class SleeperApiError extends Error {}

async function sleeperFetch<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
  } catch {
    throw new SleeperApiError("Couldn't reach Sleeper right now. Try again in a moment.");
  }
  if (res.status === 404) {
    throw new SleeperApiError("Not found on Sleeper.");
  }
  if (!res.ok) {
    throw new SleeperApiError(`Sleeper API error (${res.status}).`);
  }
  return res.json();
}

/** NFL season Sleeper expects, e.g. "2026". Jan/Feb still belong to the prior season. */
export function currentNflSeason(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  return String(month <= 1 ? now.getFullYear() - 1 : now.getFullYear());
}

export function getSleeperUser(username: string): Promise<SleeperUser> {
  return sleeperFetch<SleeperUser>(`/user/${encodeURIComponent(username.trim())}`);
}

export function getUserLeagues(sleeperUserId: string, season = currentNflSeason()): Promise<SleeperLeague[]> {
  return sleeperFetch<SleeperLeague[]>(`/user/${sleeperUserId}/leagues/nfl/${season}`);
}

export function getLeagueRosters(leagueId: string): Promise<SleeperRosterApi[]> {
  return sleeperFetch<SleeperRosterApi[]>(`/league/${leagueId}/rosters`);
}

export function getSleeperLeague(leagueId: string): Promise<SleeperLeague> {
  return sleeperFetch<SleeperLeague>(`/league/${leagueId}`);
}

export function getLeagueMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
  return sleeperFetch<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`);
}

export function getSleeperNflState(): Promise<SleeperNflState> {
  return sleeperFetch<SleeperNflState>("/state/nfl");
}

export function getLeagueUsers(leagueId: string): Promise<SleeperLeagueUser[]> {
  return sleeperFetch<SleeperLeagueUser[]>(`/league/${leagueId}/users`);
}

// The full player dictionary is ~5MB, so we cache it in memory for the life of
// the serverless instance rather than re-fetching on every sync. Sleeper's own
// docs recommend calling this endpoint "about once per day", not per-request.
let playersCache: { data: SleeperPlayerDict; fetchedAt: number } | null = null;
const PLAYERS_TTL_MS = 12 * 60 * 60 * 1000;

// Fetch the full player dictionary from Sleeper, caching it in memory for a
export async function getAllPlayers(): Promise<SleeperPlayerDict> {
  if (playersCache && Date.now() - playersCache.fetchedAt < PLAYERS_TTL_MS) {
    return playersCache.data;
  }
  const data = await sleeperFetch<SleeperPlayerDict>("/players/nfl");
  playersCache = { data, fetchedAt: Date.now() };
  return data;
}

/** Sleeper calls the defense/special-teams slot "DEF"; our schema calls it "DST". */
export function normalizeSleeperPos(pos: string | undefined): string {
  return pos === "DEF" ? "DST" : pos ?? "?";
}

/** Returns a player's name based on their ID and info, defaulting to the ID if info is missing. */
export function sleeperPlayerName(playerId: string, info: SleeperPlayerInfo | undefined): string {
  if (!info) return playerId;
  return info.full_name ?? ([info.first_name, info.last_name].filter(Boolean).join(" ") || playerId);
}

export { SleeperApiError };
