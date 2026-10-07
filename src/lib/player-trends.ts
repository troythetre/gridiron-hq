export type ScoringTrend = {
  direction: "rising" | "falling" | "steady" | "limited";
  delta: number | null;
  recentSamples: number;
  priorSamples: number;
};

const TREND_WINDOW_SIZE = 3;
const MIN_TREND_DELTA = 0.5;

export function compareScoringTrend(scores: Array<number | null>): ScoringTrend {
  const validScores = scores.filter((score): score is number => score != null && Number.isFinite(score));
  const recent = validScores.slice(-TREND_WINDOW_SIZE);
  const prior = validScores.slice(-TREND_WINDOW_SIZE * 2, -TREND_WINDOW_SIZE);
  if (recent.length < TREND_WINDOW_SIZE || prior.length < TREND_WINDOW_SIZE) {
    return {
      direction: "limited",
      delta: null,
      recentSamples: recent.length,
      priorSamples: prior.length,
    };
  }

  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const delta = average(recent) - average(prior);
  return {
    direction: delta >= MIN_TREND_DELTA ? "rising" : delta <= -MIN_TREND_DELTA ? "falling" : "steady",
    delta,
    recentSamples: recent.length,
    priorSamples: prior.length,
  };
}
