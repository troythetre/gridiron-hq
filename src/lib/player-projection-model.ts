import profilesJson from "@/data/player-profiles.json";
import type { PlayerProfileData, PlayerWeekStat } from "@/lib/player-profile-types";
import {
  type ProjectionCandidate,
  type StatKey,
  blendedPace,
} from "@/lib/projection-math";

export { STAT_LABELS, STAT_KEYS, REGULAR_SEASON_GAMES, type StatKey, type ProjectionCandidate } from "@/lib/projection-math";

// Server-only data layer: reads the player dataset (do not import this file
// from a "use client" component - see projection-math.ts for the part
// that's safe to ship to the browser) and builds the candidate lists the
// Weekly and Yearly predictions tabs are built from.

function playedGames(weeks: PlayerWeekStat[]) {
  return weeks
    .filter((week) => week.fantasyPoints != null && Number.isFinite(week.fantasyPoints))
    .sort((a, b) => a.week - b.week);
}

function candidateKey(profile: PlayerProfileData) {
  return profile.gsisId ?? `${profile.name}|${profile.team}`;
}

/** Top `limit` players by season total for a stat, with their game logs. */
export function getProjectionCandidates(statKey: StatKey, limit = 25): ProjectionCandidate[] {
  const profiles = profilesJson as PlayerProfileData[];
  const candidates = profiles
    .map((profile): ProjectionCandidate | null => {
      const games = playedGames(profile.weeks);
      if (games.length === 0) return null;
      const values = games.map((week) => week[statKey] ?? 0);
      const seasonTotal = values.reduce((sum, value) => sum + value, 0);
      if (seasonTotal <= 0) return null;
      return {
        key: candidateKey(profile),
        name: profile.name,
        team: profile.team,
        position: profile.position,
        gamesPlayed: games.length,
        seasonTotal,
        seasonAverage: seasonTotal / games.length,
        recentGames: values.slice(-5),
      };
    })
    .filter((candidate): candidate is ProjectionCandidate => candidate != null);
  return candidates.sort((a, b) => b.seasonTotal - a.seasonTotal).slice(0, limit);
}

export function gamesObservedThisSeason(): number {
  const profiles = profilesJson as PlayerProfileData[];
  return Math.max(0, ...profiles.map((profile) => playedGames(profile.weeks).length));
}

export type WeeklyLeader = {
  key: string;
  name: string;
  team: string;
  position: string;
  projectedThisWeek: number;
  seasonAverage: number;
};

/**
 * "This week's model favorites" per stat - sorted by the recency-weighted
 * pace (aggressiveness fixed at 65, leaning toward recent form since a
 * single upcoming week is closer to "what have you done lately" than a
 * full-season estimate), not by season total.
 */
export function getWeeklyLeaders(statKey: StatKey, limit = 5, aggressiveness = 65): WeeklyLeader[] {
  return getProjectionCandidates(statKey, 40)
    .map((candidate) => ({
      key: candidate.key,
      name: candidate.name,
      team: candidate.team,
      position: candidate.position,
      projectedThisWeek: Math.round(blendedPace(candidate, aggressiveness) * 10) / 10,
      seasonAverage: Math.round(candidate.seasonAverage * 10) / 10,
    }))
    .sort((a, b) => b.projectedThisWeek - a.projectedThisWeek)
    .slice(0, limit);
}
