import profilesJson from "@/data/player-profiles.json";
import type { PlayerProfileData, PlayerWeekStat } from "@/lib/player-profile-types";

// Real stat-leader and award projections, derived from the same
// player-profiles.json dataset the ridge-regression model trains on - no
// placeholder numbers. "Projected" means: current season-to-date totals,
// extrapolated to a full 17-game season at the player's current per-game
// pace. Award picks are a transparent, disclosed scoring heuristic (not an
// official, trained classifier) built on top of those same real numbers.

const REGULAR_SEASON_GAMES = 17;

type StatKey = "passingYards" | "passingTds" | "rushingYards" | "rushingTds" | "receivingYards" | "receivingTds";

export type StatLeader = {
  name: string;
  team: string;
  position: string;
  gamesPlayed: number;
  total: number;
  projectedFullSeason: number;
};

export type StatLeaderboard = {
  statKey: StatKey;
  label: string;
  leaders: StatLeader[];
};

export type AwardPick = {
  award: string;
  winner: StatLeader | null;
  rationale: string;
};

export type NflSeasonProjections = {
  season: number;
  gamesObserved: number;
  leaderboards: StatLeaderboard[];
  awards: AwardPick[];
  notModeled: string[];
};

function playedGames(weeks: PlayerWeekStat[]) {
  return weeks.filter((week) => week.fantasyPoints != null && Number.isFinite(week.fantasyPoints));
}

function sumStat(weeks: PlayerWeekStat[], key: StatKey) {
  return weeks.reduce((total, week) => total + (week[key] ?? 0), 0);
}

function toStatLeader(profile: PlayerProfileData, key: StatKey): StatLeader | null {
  const games = playedGames(profile.weeks);
  if (games.length === 0) return null;
  const total = sumStat(games, key);
  if (total <= 0) return null;
  return {
    name: profile.name,
    team: profile.team,
    position: profile.position,
    gamesPlayed: games.length,
    total,
    projectedFullSeason: Math.round((total / games.length) * REGULAR_SEASON_GAMES),
  };
}

function buildLeaderboard(profiles: PlayerProfileData[], key: StatKey, label: string, limit = 5): StatLeaderboard {
  const leaders = profiles
    .map((profile) => toStatLeader(profile, key))
    .filter((leader): leader is StatLeader => leader != null)
    .sort((a, b) => b.projectedFullSeason - a.projectedFullSeason)
    .slice(0, limit);
  return { statKey: key, label, leaders };
}

/**
 * MVP, OPOY, and Offensive Rookie of the Year are modeled with a disclosed
 * composite score over real per-player totals - not the actual voting
 * process, which also weighs team record, narrative, and award-specific
 * voter judgment this pipeline doesn't have inputs for. That's stated
 * plainly in the UI, not hidden in a tooltip.
 */
function compositeOffensiveScore(games: PlayerWeekStat[]) {
  const passingYards = sumStat(games, "passingYards");
  const passingTds = sumStat(games, "passingTds");
  const interceptions = games.reduce((total, week) => total + (week.interceptions ?? 0), 0);
  const rushingYards = sumStat(games, "rushingYards");
  const rushingTds = sumStat(games, "rushingTds");
  const receivingYards = sumStat(games, "receivingYards");
  const receivingTds = sumStat(games, "receivingTds");
  return (
    passingYards * 0.04 + passingTds * 4 - interceptions * 2 +
    rushingYards * 0.1 + rushingTds * 6 +
    receivingYards * 0.1 + receivingTds * 6
  );
}

function pickAward(
  profiles: PlayerProfileData[],
  award: string,
  rationale: string,
  filter: (profile: PlayerProfileData) => boolean,
): AwardPick {
  let best: { profile: PlayerProfileData; score: number; games: PlayerWeekStat[] } | null = null;
  for (const profile of profiles) {
    if (!filter(profile)) continue;
    const games = playedGames(profile.weeks);
    if (games.length === 0) continue;
    const score = compositeOffensiveScore(games) / games.length; // per-game pace, so partial seasons compete fairly
    if (!best || score > best.score) best = { profile, score, games };
  }
  if (!best) return { award, winner: null, rationale };
  const projectedPoints = Math.round(best.score * REGULAR_SEASON_GAMES);
  return {
    award,
    winner: {
      name: best.profile.name,
      team: best.profile.team,
      position: best.profile.position,
      gamesPlayed: best.games.length,
      total: Math.round(best.score * best.games.length),
      projectedFullSeason: projectedPoints,
    },
    rationale,
  };
}

export function getNflSeasonProjections(): NflSeasonProjections {
  const profiles = profilesJson as PlayerProfileData[];
  const gamesObserved = Math.max(
    0,
    ...profiles.map((profile) => playedGames(profile.weeks).length),
  );

  const leaderboards: StatLeaderboard[] = [
    buildLeaderboard(profiles, "passingYards", "Passing yards"),
    buildLeaderboard(profiles, "passingTds", "Passing touchdowns"),
    buildLeaderboard(profiles, "rushingYards", "Rushing yards"),
    buildLeaderboard(profiles, "rushingTds", "Rushing touchdowns"),
    buildLeaderboard(profiles, "receivingYards", "Receiving yards"),
    buildLeaderboard(profiles, "receivingTds", "Receiving touchdowns"),
  ];

  const awards: AwardPick[] = [
    pickAward(
      profiles,
      "MVP (projected)",
      "Highest weighted passing/rushing/receiving production pace, league-wide. MVP voting in practice also weighs team success and narrative, which this pipeline doesn't yet have team-record data to model.",
      () => true,
    ),
    pickAward(
      profiles,
      "Offensive Player of the Year (projected)",
      "Same composite production score, restricted to non-QBs.",
      (profile) => profile.position !== "QB",
    ),
    pickAward(
      profiles,
      "Offensive Rookie of the Year (projected)",
      "Same composite production score, restricted to players in their rookie season.",
      (profile) => profile.rookieSeason != null && profile.rookieSeason === profile.season,
    ),
  ];

  return {
    season: profiles[0]?.season ?? new Date().getFullYear(),
    gamesObserved,
    leaderboards,
    awards,
    notModeled: [
      "Defensive Player of the Year - the current data pipeline has no individual defensive stats (sacks, tackles, takeaways) per player yet, only team-level DST scoring.",
      "Coach of the Year and other non-player awards - out of scope for a player-stats pipeline.",
    ],
  };
}
