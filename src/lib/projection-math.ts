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

export function projectFullSeason(pace: number) {
  return Math.round(pace * REGULAR_SEASON_GAMES);
}
