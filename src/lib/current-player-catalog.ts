import type { PlayerProfileData } from "@/lib/player-profile-types";
import type { PlayerRow, Position } from "@/lib/types";

const POSITIONS = new Set<Position>(["QB", "RB", "WR", "TE", "K", "DST"]);

function playerKey(name: string, team: string) {
  return `${name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "")}|${team}`;
}

export function getCatalogPlayerRanks(
  profile: PlayerProfileData,
  profiles: PlayerProfileData[],
): { pos_rank: number | null; overall_rank: number | null } {
  const candidates = profiles.filter((candidate) =>
    candidate.season === profile.season &&
    POSITIONS.has(candidate.position as Position) &&
    candidate.weeks.some((week) => week.fantasyPoints != null)
  );
  const averagePoints = (candidate: PlayerProfileData) => {
    const scoredWeeks = candidate.weeks.filter((week) => week.fantasyPoints != null);
    return scoredWeeks.length
      ? scoredWeeks.reduce((total, week) => total + (week.fantasyPoints ?? 0), 0) / scoredWeeks.length
      : null;
  };
  const targetAverage = averagePoints(profile);
  if (targetAverage == null) return { pos_rank: null, overall_rank: null };

  const higherRanked = (candidate: PlayerProfileData) => {
    const candidateAverage = averagePoints(candidate);
    return candidateAverage != null && candidateAverage > targetAverage;
  };
  return {
    pos_rank: 1 + candidates.filter(
      (candidate) => candidate.position === profile.position && higherRanked(candidate),
    ).length,
    overall_rank: 1 + candidates.filter(higherRanked).length,
  };
}

function profileRow(profile: PlayerProfileData, id: number): PlayerRow {
  const games = profile.weeks.filter((week) => week.fantasyPoints != null);
  const total = games.reduce((sum, week) => sum + (week.fantasyPoints ?? 0), 0);
  return {
    id,
    name: profile.name,
    pos: profile.position as Position,
    team: profile.team,
    photoUrl: profile.headshotUrl,
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
  const ranksByKey = new Map(
    profiles
      .filter((profile) => profile.season === activeSeason)
      .map((profile) => [playerKey(profile.name, profile.team), getCatalogPlayerRanks(profile, profiles)]),
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
        photoUrl: profile.headshotUrl,
        profileHref: profile.gsisId ? `/dashboard/players/nfl-${encodeURIComponent(profile.gsisId)}` : "/dashboard/search",
      };
    }
    const ranks = ranksByKey.get(key);
    return {
      ...profileRow(profile, player.id),
      pos_rank: player.pos_rank ?? ranks?.pos_rank ?? null,
      overall_rank: player.overall_rank ?? ranks?.overall_rank ?? null,
    };
  });

  profiles.forEach((profile, index) => {
    const key = playerKey(profile.name, profile.team);
    if (
      profile.season !== activeSeason ||
      !POSITIONS.has(profile.position as Position) ||
      usedProfiles.has(key) ||
      !profile.weeks.some((week) => week.fantasyPoints != null)
    ) return;
    const ranks = ranksByKey.get(key);
    merged.push({
      ...profileRow(profile, -(index + 1)),
      pos_rank: ranks?.pos_rank ?? null,
      overall_rank: ranks?.overall_rank ?? null,
    });
    usedProfiles.add(key);
  });

  return merged;
}
