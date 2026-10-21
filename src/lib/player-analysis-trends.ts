import profilesJson from "@/data/player-profiles.json";
import type { PlayerProfileData, PlayerWeekStat } from "@/lib/player-profile-types";
import { blendedPace } from "@/lib/projection-math";

// Which players are trending up or down, for the "Player Analysis" rail at
// the top of /dashboard/rankings. "Trending" = this player's average
// fantasy production over their last 3 games vs. everything before that -
// a real, computed signal from the same dataset the rest of the model
// trains on, not a hand-picked list.
//
// Deliberately a separate module from player-trends.ts (compareScoringTrend)
// - that one is a small generic rising/falling/steady classifier used
// elsewhere (my-team-analysis.tsx) and covered by its own tests; this one
// builds the full player cards (chart data, projection) this rail needs.

const RECENT_WINDOW = 3;
const MIN_GAMES = 4; // need at least one game before the recent window to call it a "trend"

export type TrendingPlayer = {
  key: string;
  name: string;
  team: string;
  position: string;
  photoUrl: string | null;
  gamesPlayed: number;
  seasonAverage: number;
  recentAverage: number;
  priorAverage: number;
  trendDelta: number;
  nextWeekProjection: number;
  weeklyPoints: { week: number; points: number }[];
};

function playedGames(weeks: PlayerWeekStat[]) {
  return weeks
    .filter((week) => week.fantasyPoints != null && Number.isFinite(week.fantasyPoints))
    .sort((a, b) => a.week - b.week);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function toTrendingPlayer(profile: PlayerProfileData): TrendingPlayer | null {
  const games = playedGames(profile.weeks);
  if (games.length < MIN_GAMES) return null;

  const points = games.map((week) => week.fantasyPoints ?? 0);
  const recent = points.slice(-RECENT_WINDOW);
  const prior = points.slice(0, -RECENT_WINDOW);
  if (prior.length === 0) return null;

  const recentAverage = average(recent);
  const priorAverage = average(prior);
  const seasonAverage = average(points);
  const recentGames = points.slice(-5);

  return {
    key: profile.gsisId ?? `${profile.name}|${profile.team}`,
    name: profile.name,
    team: profile.team,
    position: profile.position,
    photoUrl: profile.headshotUrl,
    gamesPlayed: games.length,
    seasonAverage: Math.round(seasonAverage * 10) / 10,
    recentAverage: Math.round(recentAverage * 10) / 10,
    priorAverage: Math.round(priorAverage * 10) / 10,
    trendDelta: Math.round((recentAverage - priorAverage) * 10) / 10,
    nextWeekProjection: Math.round(blendedPace({ seasonAverage, recentGames }, 60) * 10) / 10,
    weeklyPoints: games.map((week) => ({ week: week.week, points: Math.round((week.fantasyPoints ?? 0) * 10) / 10 })),
  };
}

export type TrendingPlayers = {
  up: TrendingPlayer[];
  down: TrendingPlayer[];
};

export function getTrendingPlayers(limit = 10): TrendingPlayers {
  const profiles = profilesJson as PlayerProfileData[];
  const candidates = profiles
    .map(toTrendingPlayer)
    .filter((player): player is TrendingPlayer => player != null)
    // A guard against noise from very low-usage players: require a
    // season average worth paying attention to either way.
    .filter((player) => player.seasonAverage >= 3 || player.recentAverage >= 3);

  const up = [...candidates]
    .filter((player) => player.trendDelta > 0)
    .sort((a, b) => b.trendDelta - a.trendDelta)
    .slice(0, limit);
  const down = [...candidates]
    .filter((player) => player.trendDelta < 0)
    .sort((a, b) => a.trendDelta - b.trendDelta)
    .slice(0, limit);

  return { up, down };
}
