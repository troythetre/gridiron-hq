import profilesJson from "@/data/player-profiles.json";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import { trainFantasyScoreModel, type FantasyScoreModel } from "@/lib/fantasy-ml";

// Server-only: this file imports the (large) player-profiles.json dataset
// and runs the regression trainer, so it should only be touched from a
// server component - never from a "use client" module.

export type PipelineSource = {
  name: string;
  category: "Play-by-play & tracking" | "League sync" | "Player & content catalog" | "Derived / engineered";
  description: string;
  volume: string;
  coverage: string;
};

/**
 * A snapshot of every real dataset this platform ingests or derives, taken
 * from the ETL run recorded in data/nflverse/manifest.csv (R + nflreadr) and
 * the Supabase schema / sync scripts that feed the rest of the app. Row
 * counts for the nflverse sources are the actual totals from the most
 * recent pipeline run; they're a point-in-time snapshot, not a live query,
 * since the raw data lives outside the deployed app (see docs/nfl-data.md).
 */
export const PIPELINE_SOURCES: PipelineSource[] = [
  {
    name: "Play-by-play (nflverse)",
    category: "Play-by-play & tracking",
    description: "Every charted play since 2016 - down, distance, EPA, win probability, personnel.",
    volume: "495,409 rows",
    coverage: "2016-2026 · 11 seasons",
  },
  {
    name: "Participation / snap-level tracking (nflverse)",
    category: "Play-by-play & tracking",
    description: "Personnel groupings and snap participation for every play.",
    volume: "478,989 rows",
    coverage: "2016-2025 · 10 seasons",
  },
  {
    name: "Weekly player stats (nflverse)",
    category: "Play-by-play & tracking",
    description: "Box-score level stat lines aggregated to the player-week grain - the base unit the model trains on.",
    volume: "186,704 rows",
    coverage: "2016-2026 · 11 seasons",
  },
  {
    name: "FTN charting data",
    category: "Play-by-play & tracking",
    description: "Third-party advanced charting - route types, coverage shells, blitz/pressure tags.",
    volume: "196,044 rows",
    coverage: "2022-2026 · 5 seasons",
  },
  {
    name: "Next Gen Stats (receiving)",
    category: "Play-by-play & tracking",
    description: "NFL's player-tracking-derived separation, cushion, and air-yards metrics.",
    volume: "15,155 rows",
    coverage: "2016-2026 · 11 seasons",
  },
  {
    name: "Player bio & weekly-history catalog",
    category: "Derived / engineered",
    description: "R ETL (export-player-profiles.R) joins the sources above into one per-player record with a full weekly history - the direct input to the ML trainer.",
    volume: "2,086 players",
    coverage: "Rebuilt each pipeline run",
  },
  {
    name: "Matchup / defense-splits analysis",
    category: "Derived / engineered",
    description: "analyze-matchup-splits.R + export-player-matchup-analysis.mjs compute positional matchup leverage against each defense.",
    volume: "Per-position splits",
    coverage: "Rolling multi-season",
  },
  {
    name: "Injury reports",
    category: "Player & content catalog",
    description: "Practice-participation and game-status designations, joined into the model as an injury-burden feature.",
    volume: "Supabase: injuries",
    coverage: "Weekly",
  },
  {
    name: "Player game log",
    category: "Player & content catalog",
    description: "Persisted per-game actuals used for trend and start/sit views.",
    volume: "Supabase: player_game_log",
    coverage: "Ongoing",
  },
  {
    name: "Player catalog",
    category: "Player & content catalog",
    description: "Canonical roster, position, and team reference table.",
    volume: "Supabase: players",
    coverage: "Ongoing",
  },
  {
    name: "News feed",
    category: "Player & content catalog",
    description: "fetch-fantasy-news.mjs pulls and normalizes beat-writer coverage into a structured feed.",
    volume: "Supabase: news_items",
    coverage: "Scheduled refresh",
  },
  {
    name: "Video feed",
    category: "Player & content catalog",
    description: "fetch-fantasy-videos.mjs ingests highlight/analysis video metadata.",
    volume: "Video catalog",
    coverage: "Scheduled refresh",
  },
  {
    name: "ESPN league sync",
    category: "League sync",
    description: "OAuth-free cookie sync pulls a connected ESPN league's rosters and scoring settings.",
    volume: "Supabase: espn_rosters / espn_links",
    coverage: "On demand",
  },
  {
    name: "Sleeper league sync",
    category: "League sync",
    description: "Sleeper's public API syncs league, roster, and full player-ID map data.",
    volume: "Supabase: sleeper_rosters / sleeper_links",
    coverage: "On demand",
  },
  {
    name: "Mock draft board",
    category: "Player & content catalog",
    description: "Aggregated consensus mock-draft data for rookie evaluation.",
    volume: "nfl-mock-draft.ts",
    coverage: "Seasonal",
  },
];

export type ModelShowcase = {
  validation: FantasyScoreModel["validation"];
  improvementPercent: number | null;
  baseFeatureCount: number;
  contextFeatureCount: number;
  positionsModeled: number;
};

/**
 * Trains the real ridge-regression model on the real player-profiles
 * dataset, right here in the server component - these numbers are computed
 * live on every request, the same call leagues/page.tsx makes for the
 * "My Team" holdout-MAE stat, just surfaced front-and-center instead of
 * buried behind a login + connected league.
 */
export function getModelShowcase(): ModelShowcase {
  const profiles = profilesJson as PlayerProfileData[];
  const model = trainFantasyScoreModel(profiles);
  const { modelMae, baselineMae } = model.validation;
  const improvementPercent = modelMae != null && baselineMae != null && baselineMae > 0
    ? ((baselineMae - modelMae) / baselineMae) * 100
    : null;
  return {
    validation: model.validation,
    improvementPercent,
    baseFeatureCount: 11,
    contextFeatureCount: 16,
    positionsModeled: Object.keys(model.models).length,
  };
}
