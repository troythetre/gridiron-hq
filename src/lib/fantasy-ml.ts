import type { PlayerProfileData, PlayerWeekStat } from "@/lib/player-profile-types";

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
const FEATURE_COUNT = 10;
const RIDGE_PENALTY = 0.25;

type ModelObservation = {
  points: number;
  opportunities: number;
  snapShare: number | null;
  injuryStatus: string | null;
  practiceStatus: string | null;
};

type TrainingRow = {
  season: number;
  position: string;
  features: number[];
  target: number;
};

export type FantasyScoreModel = {
  models: Partial<Record<(typeof POSITIONS)[number], number[]>>;
  validation: {
    modelMae: number | null;
    baselineMae: number | null;
    samples: number;
    seasons: number[];
  };
};

export type FantasyScoreForecast = {
  points: number;
};

function normalizePosition(position: string): (typeof POSITIONS)[number] | null {
  const normalized = position.toUpperCase();
  if (normalized === "DEF" || normalized === "D/ST") return "DST";
  return POSITIONS.includes(normalized as (typeof POSITIONS)[number])
    ? normalized as (typeof POSITIONS)[number]
    : null;
}

function concernSeverity(reportStatus: string | null, practiceStatus: string | null): number {
  const report = (reportStatus ?? "").toLowerCase();
  const practice = (practiceStatus ?? "").toLowerCase();
  const reportScore = report.includes("out") || report.includes("injured reserve") ? 1
    : report.includes("doubtful") ? 0.8
      : report.includes("questionable") ? 0.45
        : report.includes("probable") ? 0.15 : 0;
  const practiceScore = practice.includes("did not participate") || practice.includes("dnp") ? 0.55
    : practice.includes("limited") ? 0.3 : 0;
  return Math.max(reportScore, practiceScore);
}

function buildFeatures(previous: ModelObservation[], currentConcern = 0): number[] {
  const recent = previous.slice(-3);
  const prior = previous.slice(-6, -3);
  const recentAverage = recent.reduce((sum, game) => sum + game.points, 0) / recent.length;
  const priorAverage = prior.length
    ? prior.reduce((sum, game) => sum + game.points, 0) / prior.length
    : recentAverage;
  const seasonAverage = previous.reduce((sum, game) => sum + game.points, 0) / previous.length;
  const recentOpportunities = recent.reduce((sum, game) => sum + game.opportunities, 0) / recent.length;
  const priorOpportunities = prior.length
    ? prior.reduce((sum, game) => sum + game.opportunities, 0) / prior.length
    : recentOpportunities;
  const snapGames = recent.filter((game) => game.snapShare != null);
  const recentSnapShare = snapGames.length
    ? snapGames.reduce((sum, game) => sum + game.snapShare!, 0) / snapGames.length
    : 0;
  const recentInjuryBurden = previous.slice(-6).filter((game) => concernSeverity(game.injuryStatus, game.practiceStatus) > 0).length / 6;

  return [
    1,
    previous.at(-1)!.points / 10,
    recentAverage / 10,
    seasonAverage / 10,
    (recentAverage - priorAverage) / 10,
    recentOpportunities / 10,
    (recentOpportunities - priorOpportunities) / 10,
    recentSnapShare,
    snapGames.length ? 1 : 0,
    recentInjuryBurden,
    currentConcern,
  ];
}

function solve(matrix: number[][], vector: number[]): number[] | null {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    if (Math.abs(augmented[pivot][column]) < 1e-10) return null;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];

    const divisor = augmented[column][column];
    for (let cell = column; cell <= size; cell += 1) augmented[column][cell] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let cell = column; cell <= size; cell += 1) {
        augmented[row][cell] -= factor * augmented[column][cell];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function fit(rows: TrainingRow[]): number[] | null {
  if (rows.length < FEATURE_COUNT + 1) return null;
  const matrix = Array.from({ length: FEATURE_COUNT + 1 }, () => Array(FEATURE_COUNT + 1).fill(0));
  const vector = Array(FEATURE_COUNT + 1).fill(0);

  for (const row of rows) {
    for (let left = 0; left <= FEATURE_COUNT; left += 1) {
      vector[left] += row.features[left] * row.target;
      for (let right = 0; right <= FEATURE_COUNT; right += 1) {
        matrix[left][right] += row.features[left] * row.features[right];
      }
    }
  }
  for (let index = 1; index <= FEATURE_COUNT; index += 1) {
    matrix[index][index] += RIDGE_PENALTY;
  }
  return solve(matrix, vector);
}

function predict(coefficients: number[], features: number[]) {
  return Math.max(0, coefficients.reduce((sum, coefficient, index) => sum + coefficient * features[index], 0));
}

function profileRows(profile: PlayerProfileData): {
  season: number;
  week: number;
  points: number | null;
  opportunities: number;
  snapShare: number | null;
  injuryStatus: string | null;
  practiceStatus: string | null;
}[] {
  const seasons = profile.history?.length
    ? profile.history.map((entry) => ({ season: entry.season, weeks: entry.weeks }))
    : [{ season: profile.season, weeks: profile.weeks }];
  const seen = new Set<string>();
  return seasons.flatMap(({ season, weeks }) => weeks
    .filter((week) => Number.isFinite(week.week))
    .filter((week) => {
      const key = `${season}-${week.week}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((week) => ({
      season,
      week: week.week,
      points: week.fantasyPoints,
      opportunities: (week.targets ?? 0) + (week.carries ?? 0),
      snapShare: week.snapShare ?? null,
      injuryStatus: week.injuryStatus ?? null,
      practiceStatus: week.practiceStatus ?? null,
    })));
}

function trainingRows(profiles: PlayerProfileData[]): TrainingRow[] {
  const rows: TrainingRow[] = [];
  for (const profile of profiles) {
    const position = normalizePosition(profile.position);
    if (!position) continue;
    const bySeason = new Map<number, ModelObservation[]>();
    for (const row of profileRows(profile)) {
      if (row.points == null || !Number.isFinite(row.points)) continue;
      const seasonRows = bySeason.get(row.season) ?? [];
      seasonRows.push({
        week: row.week,
        points: row.points,
        opportunities: row.opportunities,
        snapShare: row.snapShare,
        injuryStatus: row.injuryStatus,
        practiceStatus: row.practiceStatus,
      });
      bySeason.set(row.season, seasonRows);
    }

    for (const report of profile.injuryHistory ?? []) {
      if (!report.reportStatus?.toLowerCase().includes("out")) continue;
      const seasonRows = bySeason.get(report.season) ?? [];
      if (!seasonRows.some((game) => game.week === report.week)) {
        seasonRows.push({
          week: report.week,
          points: 0,
          opportunities: 0,
          snapShare: 0,
          injuryStatus: report.reportStatus,
          practiceStatus: report.practiceStatus,
        });
        bySeason.set(report.season, seasonRows);
      }
    }

    for (const [season, games] of bySeason) {
      games.sort((a, b) => a.week - b.week);
      for (let index = 2; index < games.length; index += 1) {
        const previous = games.slice(0, index);
        const current = games[index];
        rows.push({
          season,
          position,
          features: buildFeatures(previous, concernSeverity(current.injuryStatus, current.practiceStatus)),
          target: current.points,
        });
      }
    }
  }
  return rows;
}

export function trainFantasyScoreModel(profiles: PlayerProfileData[]): FantasyScoreModel {
  const rows = trainingRows(profiles);
  const seasons = [...new Set(rows.map((row) => row.season))].sort((a, b) => a - b);
  const validationSeason = seasons.at(-1);
  const training = rows.filter((row) => validationSeason != null && row.season < validationSeason);
  const validation = rows.filter((row) => row.season === validationSeason);
  const validationModels = new Map(
    POSITIONS.map((position) => [
      position,
      fit(training.filter((candidate) => candidate.position === position)),
    ]),
  );
  const validationPredictions = validation.flatMap((row) => {
    const coefficients = validationModels.get(row.position as (typeof POSITIONS)[number]);
    return coefficients ? [{ actual: row.target, predicted: predict(coefficients, row.features), baseline: row.features[2] * 10 }] : [];
  });
  const models: FantasyScoreModel["models"] = {};

  for (const position of POSITIONS) {
    const coefficients = fit(rows.filter((row) => row.position === position));
    if (coefficients) models[position] = coefficients;
  }

  const meanAbsoluteError = (values: number[]) => values.length
    ? values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length
    : null;
  return {
    models,
    validation: {
      modelMae: meanAbsoluteError(validationPredictions.map((row) => row.predicted - row.actual)),
      baselineMae: meanAbsoluteError(validationPredictions.map((row) => row.baseline - row.actual)),
      samples: validationPredictions.length,
      seasons: validationSeason == null ? [] : [validationSeason],
    },
  };
}

export function forecastFantasyScore(
  weeks: Pick<PlayerWeekStat, "week" | "fantasyPoints" | "targets" | "carries" | "snapShare" | "injuryStatus" | "practiceStatus">[],
  position: string,
  model: FantasyScoreModel,
  currentInjuryStatus: string | null = null,
): FantasyScoreForecast | null {
  const normalizedPosition = normalizePosition(position);
  const coefficients = normalizedPosition ? model.models[normalizedPosition] : undefined;
  const previous = weeks
    .filter((week) => week.fantasyPoints != null && Number.isFinite(week.fantasyPoints))
    .sort((a, b) => a.week - b.week)
    .map((week) => ({
      points: week.fantasyPoints!,
      opportunities: (week.targets ?? 0) + (week.carries ?? 0),
      snapShare: week.snapShare ?? null,
      injuryStatus: week.injuryStatus ?? null,
      practiceStatus: week.practiceStatus ?? null,
    }));
  if (!coefficients || previous.length < 2) return null;

  const concern = concernSeverity(currentInjuryStatus, null);
  const availability = concern >= 1 ? 0
    : concern >= 0.8 ? 0.35
      : concern >= 0.45 ? 0.8
        : 1;
  return {
    points: predict(coefficients, buildFeatures(previous, concern)) * availability,
  };
}
