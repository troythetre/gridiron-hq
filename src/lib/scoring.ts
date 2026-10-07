import type { PlayerTradeContext } from "@/lib/types";

/**
 * Explainable Start/Sit estimate. It blends season production, recency-weighted
 * production, empirical floor/upside, role stability, trend, and injury status.
 */

export type InjuryStatus = "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "MONITOR" | null;

export interface ScoredPlayer {
  name: string;
  pos: string;
  team: string;
  avg_pts: number;
  trend: number;
  floorScore: number;
  upsideScore: number;
  upsideWeight: number;
  injuryStatus: InjuryStatus;
  injuryNote?: string;
  score: number;
  recommendation: "START" | "FLEX" | "SIT" | "OUT";
  reasons: string[];
}

const INJURY_PENALTY: Record<Exclude<InjuryStatus, null>, number> = {
  OUT: 9999, // effectively removes them from consideration
  DOUBTFUL: 9,
  QUESTIONABLE: 3.5,
  MONITOR: 1,
};

type WeeklyScore = {
  week: number;
  points: number;
  carries?: number | null;
  targets?: number | null;
  snapShare?: number | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function quantile(values: number[], probability: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * fraction;
}

function recencyWeightedMean(values: number[]) {
  const weights = values.map((_, index) => index + 1);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  return values.reduce((sum, value, index) => sum + value * weights[index], 0) / weightTotal;
}

function linearTrend(values: number[]) {
  if (values.length < 2) return 0;
  const meanX = (values.length - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length;
  const numerator = values.reduce((sum, value, index) => sum + (index - meanX) * (value - meanY), 0);
  const denominator = values.reduce((sum, _, index) => sum + (index - meanX) ** 2, 0);
  return denominator ? numerator / denominator : 0;
}

export function scorePlayer(input: {
  name: string;
  pos: string;
  team: string;
  wk1_pts: number | null;
  wk2_pts: number | null;
  avg_pts: number;
  weeklyScores?: WeeklyScore[];
  upsideWeight?: number;
  manualFloor?: number;
  injuryStatus?: InjuryStatus;
  injuryNote?: string;
}): ScoredPlayer {
  const weeklyScores = (input.weeklyScores ?? [])
    .filter((week) => Number.isFinite(week.points))
    .sort((a, b) => a.week - b.week);
  const fallbackScores: WeeklyScore[] = [
    ...(input.wk1_pts == null ? [] : [{ week: 1, points: input.wk1_pts }]),
    ...(input.wk2_pts == null ? [] : [{ week: 2, points: input.wk2_pts }]),
  ];
  const samples = weeklyScores.length ? weeklyScores : fallbackScores;
  const points = samples.map((sample) => sample.points);
  const recent = points.slice(-5);
  const recentAverage = recent.length ? recencyWeightedMean(recent) : input.avg_pts;
  const baseline = input.avg_pts * 0.55 + recentAverage * 0.45;
  const observedFloor = points.length ? quantile(points, 0.2) : input.avg_pts;
  const floorEstimate = input.manualFloor == null ? observedFloor : Math.max(observedFloor, input.manualFloor);
  const upsideEstimate = points.length ? quantile(points, 0.8) : input.avg_pts;
  const workload = samples.map((sample) =>
    sample.carries != null || sample.targets != null
      ? (sample.carries ?? 0) + (sample.targets ?? 0)
      : sample.snapShare ?? null
  ).filter((value): value is number => value != null);
  let roleStability = 0;
  if (workload.length >= 2) {
    const workloadMean = workload.reduce((sum, value) => sum + value, 0) / workload.length;
    const workloadVariance = workload.reduce((sum, value) => sum + (value - workloadMean) ** 2, 0) / workload.length;
    const coefficientOfVariation = workloadMean > 0 ? Math.sqrt(workloadVariance) / workloadMean : 1;
    roleStability = clamp((0.45 - coefficientOfVariation) * 1.2, -0.8, 0.5);
  }
  const floorScore = floorEstimate * 0.7 + baseline * 0.3 + roleStability;
  const upsideScore = upsideEstimate * 0.7 + baseline * 0.3;
  const upsideWeight = clamp(input.upsideWeight ?? 0.35, 0, 1);
  const recentTrend = linearTrend(recent);
  const trend = recentTrend || (
    input.wk1_pts != null && input.wk2_pts != null ? input.wk2_pts - input.wk1_pts : 0
  );
  const trendImpact = clamp(trend * (0.12 + upsideWeight * 0.18), -2.5, 2.5);
  const injuryStatus = input.injuryStatus ?? null;
  const penalty = injuryStatus
    ? INJURY_PENALTY[injuryStatus] * (1.2 - upsideWeight * 0.4)
    : 0;
  const blendedRange = floorScore * (1 - upsideWeight) + upsideScore * upsideWeight;
  const score = Math.round((blendedRange + trendImpact - penalty) * 100) / 100;

  const reasons: string[] = [
    `${input.avg_pts.toFixed(1)} season pts/game · ${recentAverage.toFixed(1)} recency-weighted recent average`,
    `Floor estimate ${floorScore.toFixed(1)} · upside estimate ${upsideScore.toFixed(1)} (${Math.round((1 - upsideWeight) * 100)}% floor / ${Math.round(upsideWeight * 100)}% upside)`,
  ];
  if (input.manualFloor != null) reasons.push(`your minimum expectation: ${input.manualFloor.toFixed(1)} pts`);
  if (roleStability !== 0) reasons.push(`workload stability ${roleStability > 0 ? "+" : ""}${roleStability.toFixed(1)} floor adjustment`);
  if (trend !== 0) {
    reasons.push(`${trend > 0 ? "recent scoring trend +" : "recent scoring trend "}${trend.toFixed(1)} pts/game slope`);
  }
  if (injuryStatus) {
    reasons.push(`${injuryStatus.toLowerCase()} risk -${penalty.toFixed(1)} points (${input.injuryNote ?? "status adjustment"})`);
  }

  let recommendation: ScoredPlayer["recommendation"] = "SIT";
  if (injuryStatus === "OUT") {
    recommendation = "OUT";
  } else if (score >= 14) {
    recommendation = "START";
  } else if (score >= 7) {
    recommendation = "FLEX";
  }

  return {
    name: input.name,
    pos: input.pos,
    team: input.team,
    avg_pts: input.avg_pts,
    trend,
    floorScore: Math.round(floorScore * 100) / 100,
    upsideScore: Math.round(upsideScore * 100) / 100,
    upsideWeight,
    injuryStatus,
    injuryNote: input.injuryNote,
    score,
    recommendation,
    reasons,
  };
}

export function compare(
  a: Parameters<typeof scorePlayer>[0],
  b: Parameters<typeof scorePlayer>[0],
  upsideWeight?: number,
): { winner: ScoredPlayer; loser: ScoredPlayer; margin: number } {
  const sa = scorePlayer({ ...a, upsideWeight });
  const sb = scorePlayer({ ...b, upsideWeight });
  const [winner, loser] = sa.score >= sb.score ? [sa, sb] : [sb, sa];
  return { winner, loser, margin: Math.round((winner.score - loser.score) * 100) / 100 };
}

/**
 * Trade value engine.
 *
 * Same philosophy as the start/sit engine above: transparent and shown in full,
 * not a black box. It differs from scorePlayer() in two ways that matter for a
 * trade (a season-long decision) rather than a start/sit call (a one-week one):
 *
 *   1. Positional scarcity - a point of production from a scarce position (TE,
 *      RB) is worth a bit more in trade than the same point from a deep one
 *      (K, DST, and to a lesser extent QB in single-QB leagues).
 *   2. A much lighter injury discount - a player who is OUT this week has lost
 *      almost all their start/sit value for THIS week, but a healthy track
 *      record still makes them valuable in a trade once they're back, so the
 *      penalty here is a fraction of the start/sit one.
 *
 * value = avg_pts * positionMultiplier(pos) - tradeInjuryDiscount(status)
 */

export interface TradeValuedPlayer {
  playerId: number;
  name: string;
  pos: string;
  team: string;
  avg_pts: number;
  context: PlayerTradeContext | null;
  injuryStatus: InjuryStatus;
  value: number;
  reasons: string[];
}

const POSITION_MULTIPLIER: Record<string, number> = {
  QB: 0.85, // deep position in single-QB leagues - easy to replace on waivers
  RB: 1.05, // workhorse scarcity
  WR: 1.0,
  TE: 1.15, // the shallowest skill position in most leagues
  K: 0.4,
  DST: 0.4,
};

const TRADE_INJURY_DISCOUNT: Record<Exclude<InjuryStatus, null>, number> = {
  OUT: 4,
  DOUBTFUL: 2,
  QUESTIONABLE: 0.75,
  MONITOR: 0.25,
};

export function tradeValue(input: {
  playerId: number;
  name: string;
  pos: string;
  team: string;
  avg_pts: number;
  context?: PlayerTradeContext | null;
  injuryStatus?: InjuryStatus;
  injuryNote?: string;
}): TradeValuedPlayer {
  const multiplier = POSITION_MULTIPLIER[input.pos] ?? 1;
  const injuryStatus = input.injuryStatus ?? null;
  const discount = injuryStatus ? TRADE_INJURY_DISCOUNT[injuryStatus] : 0;
  const context = input.context ?? null;
  let weightedAverage = input.avg_pts;
  const adjustments: string[] = [];
  if (context) {
    const careerAverage = context.careerAverage ?? input.avg_pts;
    const seasonAverage = context.currentSeasonAverage ?? input.avg_pts;
    weightedAverage = careerAverage * 0.35 + seasonAverage * 0.65;
    if (context.careerAverage != null) {
      adjustments.push(`career baseline ${careerAverage.toFixed(1)} pts/game`);
    }
    if (context.seasonChange != null) {
      adjustments.push(`${context.seasonChange >= 0 ? "+" : ""}${context.seasonChange.toFixed(1)} pts/game vs. last season`);
    }
    if (context.developmentPerSeason != null) {
      adjustments.push(`${context.developmentPerSeason >= 0 ? "+" : ""}${context.developmentPerSeason.toFixed(1)} pts/game annual development trend`);
    }
    if (context.opportunityChangePct != null) {
      adjustments.push(`${context.opportunityChangePct >= 0 ? "+" : ""}${context.opportunityChangePct.toFixed(0)}% opportunities vs. last season`);
    }
    const passRateChange = context.teamPassRate != null && context.leaguePassRate != null
      ? context.teamPassRate - context.leaguePassRate
      : null;
    if (passRateChange != null && Math.abs(passRateChange) >= 0.03) {
      adjustments.push(`team pass rate ${(passRateChange * 100).toFixed(1)} points vs. league average (play-calling proxy, not coach-specific)`);
    }
  }
  const development = context?.developmentPerSeason ?? 0;
  const seasonalChange = context?.seasonChange ?? 0;
  const opportunityChange = context?.opportunityChangePct ?? 0;
  const passRateChange = context?.teamPassRate != null && context.leaguePassRate != null
    ? context.teamPassRate - context.leaguePassRate
    : 0;
  const passStyleFactor = input.pos === "QB" ? 14 : input.pos === "WR" ? 10 : input.pos === "TE" ? 7 : input.pos === "RB" ? -8 : 0;
  const contextAdjustment = context
    ? Math.max(-3, Math.min(3,
      development * 0.12
      + seasonalChange * 0.08
      + Math.max(-1.5, Math.min(1.5, opportunityChange / 100 * 1.5))
      + passRateChange * passStyleFactor,
    ))
    : 0;
  const value = Math.max(0, Math.round(((weightedAverage + contextAdjustment) * multiplier - discount) * 100) / 100);

  const reasons: string[] = [
    `${weightedAverage.toFixed(1)} pts/game weighted career/season baseline x ${multiplier.toFixed(2)} ${input.pos} scarcity`,
    ...adjustments,
  ];
  if (contextAdjustment) reasons.push(`${contextAdjustment >= 0 ? "+" : ""}${contextAdjustment.toFixed(1)} context adjustment`);
  if (injuryStatus) {
    reasons.push(`-${discount.toFixed(2)} for ${injuryStatus.toLowerCase()} status (${input.injuryNote ?? "injury risk"})`);
  }

  return {
    playerId: input.playerId,
    name: input.name,
    pos: input.pos,
    team: input.team,
    avg_pts: input.avg_pts,
    context,
    injuryStatus,
    value,
    reasons,
  };
}

export type TradeVerdict = "FAVORS_YOU" | "FAIR" | "FAVORS_THEM";

export interface TradeEvaluation {
  giving: TradeValuedPlayer[];
  receiving: TradeValuedPlayer[];
  givingValue: number;
  receivingValue: number;
  delta: number; // receivingValue - givingValue, from the proposer's perspective
  percentDiff: number;
  verdict: TradeVerdict;
}

const FAIRNESS_BAND_PCT = 15; // within +/-15% of the midpoint counts as "fair"

export function evaluateTrade(
  giving: Parameters<typeof tradeValue>[0][],
  receiving: Parameters<typeof tradeValue>[0][]
): TradeEvaluation {
  const givingScored = giving.map(tradeValue);
  const receivingScored = receiving.map(tradeValue);
  const givingValue = Math.round(givingScored.reduce((s, p) => s + p.value, 0) * 100) / 100;
  const receivingValue = Math.round(receivingScored.reduce((s, p) => s + p.value, 0) * 100) / 100;
  const delta = Math.round((receivingValue - givingValue) * 100) / 100;
  const midpoint = (givingValue + receivingValue) / 2 || 1;
  const percentDiff = Math.round((delta / midpoint) * 1000) / 10;

  let verdict: TradeVerdict = "FAIR";
  if (percentDiff > FAIRNESS_BAND_PCT) verdict = "FAVORS_YOU";
  else if (percentDiff < -FAIRNESS_BAND_PCT) verdict = "FAVORS_THEM";

  return {
    giving: givingScored,
    receiving: receivingScored,
    givingValue,
    receivingValue,
    delta,
    percentDiff,
    verdict,
  };
}
