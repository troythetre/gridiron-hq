// Pure projection math shared between server-side data prep
// (player-projection-model.ts, which also imports the player dataset) and
// client components (the Yearly tab's aggressiveness slider). This file
// has NO data import on purpose - it must stay safe to import from a "use
// client" component without pulling the multi-megabyte player dataset into
// the browser bundle (that exact mistake is what made /dashboard/rankings
// slow before it was fixed).

export const REGULAR_SEASON_GAMES = 17;
export const RECENT_FORM_WINDOW = 3;

export type StatKey =
  | "passingYards"
  | "passingTds"
  | "rushingYards"
  | "rushingTds"
  | "receivingYards"
  | "receivingTds"
  | "receptions";

export const STAT_LABELS: Record<StatKey, string> = {
  passingYards: "Passing yards",
  passingTds: "Passing touchdowns",
  rushingYards: "Rushing yards",
  rushingTds: "Rushing touchdowns",
  receivingYards: "Receiving yards",
  receivingTds: "Receiving touchdowns",
  receptions: "Receptions",
};

export const STAT_KEYS = Object.keys(STAT_LABELS) as StatKey[];

export type ProjectionCandidate = {
  key: string;
  name: string;
  team: string;
  position: string;
  gamesPlayed: number;
  seasonTotal: number;
  seasonAverage: number;
  // Up to the last 5 scored games' values for this stat, chronological
  // (most recent last).
  recentGames: number[];
};

export function recentFormAverage(recentGames: number[], window = RECENT_FORM_WINDOW) {
  const slice = recentGames.slice(-window);
  return slice.length ? slice.reduce((sum, value) => sum + value, 0) / slice.length : 0;
}

/**
 * aggressiveness in [0, 100]: 0 = pure season-long pace, 100 = pure
 * recent-form pace. This is the model's one tunable knob, directly
 * controlled by the Yearly tab's slider.
 */
export function blendedPace(
  candidate: Pick<ProjectionCandidate, "seasonAverage" | "recentGames">,
  aggressiveness: number,
) {
  const t = Math.max(0, Math.min(100, aggressiveness)) / 100;
  const recent = recentFormAverage(candidate.recentGames);
  return candidate.seasonAverage * (1 - t) + recent * t;
}

/**
 * The real NFL single-season leader for each tracked stat - the practical
 * ceiling a full-season projection should never exceed. A hot early-season
 * stretch (a handful of big games) blended through blendedPace() can
 * otherwise extrapolate to a 17-game pace no player has ever actually put
 * up over a full season; projectFullSeason() below caps against these so
 * the Yearly tab can't present a statistically unprecedented total as a
 * plain projection.
 *
 * Verified against pro-football-reference.com's single-season leaderboards
 * and still standing through the 2025 season. Recheck if a new record is
 * set - these are facts about NFL history, not modeling constants, and
 * will eventually need a bump.
 */
export const HISTORICAL_SEASON_CEILINGS: Record<StatKey, { value: number; holder: string; year: number }> = {
  passingYards: { value: 5477, holder: "Peyton Manning", year: 2013 },
  passingTds: { value: 55, holder: "Peyton Manning", year: 2013 },
  rushingYards: { value: 2105, holder: "Eric Dickerson", year: 1984 },
  rushingTds: { value: 28, holder: "LaDainian Tomlinson", year: 2006 },
  receivingYards: { value: 1964, holder: "Calvin Johnson", year: 2012 },
  receivingTds: { value: 23, holder: "Randy Moss", year: 2007 },
  receptions: { value: 149, holder: "Michael Thomas", year: 2019 },
};

export type BoundedSeasonProjection = {
  /** The number to display - raw projection, or the record ceiling if that was exceeded. */
  value: number;
  /** What the naive pace * 17 math actually came out to, before capping. */
  raw: number;
  /** True when raw exceeded the real NFL record and had to be capped. */
  cappedAtRecord: boolean;
};

export function projectFullSeason(pace: number, statKey: StatKey): BoundedSeasonProjection {
  const raw = Math.round(pace * REGULAR_SEASON_GAMES);
  const ceiling = HISTORICAL_SEASON_CEILINGS[statKey].value;
  const cappedAtRecord = raw > ceiling;
  return { value: cappedAtRecord ? ceiling : raw, raw, cappedAtRecord };
}
