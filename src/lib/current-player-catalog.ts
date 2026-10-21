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

// `profiles` is a static JSON import - always the same array reference
// within a running server process - so the season-rank computation below
// (the expensive part) is cached per-reference. Before this, every single
// request to /dashboard/rankings re-ran an O(n^2) rank computation (calling
// getCatalogPlayerRanks, itself an O(n) scan, once per profile) with no
// caching, which is what made the rankings page feel slow to navigate to.
const seasonRanksCache = new WeakMap<PlayerProfileData[], Map<string, { pos_rank: number | null; overall_rank: number | null }>>();

function averagePoints(profile: PlayerProfileData): number | null {
  const scoredWeeks = profile.weeks.filter((week) => week.fantasyPoints != null);
  return scoredWeeks.length
    ? scoredWeeks.reduce((total, week) => total + (week.fantasyPoints ?? 0), 0) / scoredWeeks.length
    : null;
}

// Ranks a set of {key, average} entries in one O(n log n) sort instead of
// the previous O(n^2) pairwise "how many candidates score higher than me"
// comparison. Tied averages share a rank, matching the original semantics
// (rank = 1 + count of entries with a strictly greater average).
function rankByAverage(entries: { key: string; average: number }[]): Map<string, number> {
  const sorted = [...entries].sort((a, b) => b.average - a.average);
  const ranks = new Map<string, number>();
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].average === sorted[i].average) j++;
    for (let k = i; k < j; k++) ranks.set(sorted[k].key, i + 1);
    i = j;
  }
  return ranks;
}

function computeSeasonRanks(
  profiles: PlayerProfileData[],
  activeSeason: number,
): Map<string, { pos_rank: number | null; overall_rank: number | null }> {
  const candidates = profiles
    .filter((profile) => profile.season === activeSeason && POSITIONS.has(profile.position as Position))
    .map((profile) => ({ profile, key: playerKey(profile.name, profile.team), average: averagePoints(profile) }))
    .filter((entry): entry is { profile: PlayerProfileData; key: string; average: number } => entry.average != null);

  const overallRanks = rankByAverage(candidates.map(({ key, average }) => ({ key, average })));
  const posRanksByPosition = new Map<Position, Map<string, number>>();
  for (const position of POSITIONS) {
    const inPosition = candidates.filter((entry) => entry.profile.position === position);
    posRanksByPosition.set(position, rankByAverage(inPosition.map(({ key, average }) => ({ key, average }))));
  }

  const result = new Map<string, { pos_rank: number | null; overall_rank: number | null }>();
  for (const { profile, key } of candidates) {
    const posRanks = posRanksByPosition.get(profile.position as Position);
    result.set(key, {
      overall_rank: overallRanks.get(key) ?? null,
      pos_rank: posRanks?.get(key) ?? null,
    });
  }
  return result;
}

function getSeasonRanks(profiles: PlayerProfileData[], activeSeason: number) {
  const cached = seasonRanksCache.get(profiles);
  if (cached) return cached;
  const computed = computeSeasonRanks(profiles, activeSeason);
  seasonRanksCache.set(profiles, computed);
  return computed;
}

export function mergeCurrentPlayerCatalog(players: PlayerRow[], profiles: PlayerProfileData[]): PlayerRow[] {
  const activeSeason = Math.max(...profiles.map((profile) => profile.season));
  const profilesByKey = new Map(
    profiles
      .filter((profile) => profile.season === activeSeason && POSITIONS.has(profile.position as Position))
      .map((profile) => [playerKey(profile.name, profile.team), profile]),
  );
  const ranksByKey = getSeasonRanks(profiles, activeSeason);
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
