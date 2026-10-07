import type { PlayerProfileData } from "@/lib/player-profile-types";
import type { PlayerRow, Position } from "@/lib/types";

const POSITIONS = new Set<Position>(["QB", "RB", "WR", "TE", "K", "DST"]);

function playerKey(name: string, team: string) {
  return `${name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "")}|${team}`;
}

function profileRow(profile: PlayerProfileData, id: number): PlayerRow {
  const games = profile.weeks.filter((week) => week.fantasyPoints != null);
  const total = games.reduce((sum, week) => sum + (week.fantasyPoints ?? 0), 0);
  return {
    id,
    name: profile.name,
    pos: profile.position as Position,
    team: profile.team,
    wk1_pts: games.find((week) => week.week === 1)?.fantasyPoints ?? null,
    wk2_pts: games.find((week) => week.week === 2)?.fantasyPoints ?? null,
    total_pts: total,
    games: games.length,
    avg_pts: games.length ? total / games.length : 0,
    pos_rank: null,
    overall_rank: null,
    profileHref: profile.gsisId ? `/dashboard/players/nfl-${encodeURIComponent(profile.gsisId)}` : "/dashboard/search",
  };
}

export function mergeCurrentPlayerCatalog(players: PlayerRow[], profiles: PlayerProfileData[]): PlayerRow[] {
  const activeSeason = Math.max(...profiles.map((profile) => profile.season));
  const profilesByKey = new Map(
    profiles
      .filter((profile) => profile.season === activeSeason && POSITIONS.has(profile.position as Position))
      .map((profile) => [playerKey(profile.name, profile.team), profile]),
  );
  const usedProfiles = new Set<string>();
  const merged = players.map((player) => {
    const key = playerKey(player.name, player.team);
    const profile = profilesByKey.get(key);
    if (!profile) return player;
    usedProfiles.add(key);
    if (!profile.weeks.some((week) => week.fantasyPoints != null)) {
      return {
        ...player,
        profileHref: profile.gsisId ? `/dashboard/players/nfl-${encodeURIComponent(profile.gsisId)}` : "/dashboard/search",
      };
    }
    return { ...profileRow(profile, player.id), pos_rank: player.pos_rank, overall_rank: player.overall_rank };
  });

  profiles.forEach((profile, index) => {
    const key = playerKey(profile.name, profile.team);
    if (
      profile.season !== activeSeason ||
      !POSITIONS.has(profile.position as Position) ||
      usedProfiles.has(key) ||
      !profile.weeks.some((week) => week.fantasyPoints != null)
    ) return;
    merged.push(profileRow(profile, -(index + 1)));
    usedProfiles.add(key);
  });

  return merged;
}
