/**
 * Start/Sit scoring engine.
 *
 * This is deliberately a transparent, explainable heuristic rather than a black-box
 * model: every input is visible in the UI next to the final number, so a user can
 * see *why* a player scored the way they did. It blends three signals:
 *
 *   1. Production  - average half-PPR points per game so far this season.
 *   2. Trend       - how much better/worse Week 2 was vs. Week 1 (recent form).
 *   3. Injury risk - a status-based penalty, since a point total alone doesn't
 *                    capture "probably won't play 100% of snaps this week."
 *
 * Score = avg_pts + (trend * TREND_WEIGHT) - injuryPenalty(status)
 */

export type InjuryStatus = "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "MONITOR" | null;

export interface ScoredPlayer {
  name: string;
  pos: string;
  team: string;
  avg_pts: number;
  trend: number;
  injuryStatus: InjuryStatus;
  injuryNote?: string;
  score: number;
  recommendation: "START" | "FLEX" | "SIT" | "OUT";
  reasons: string[];
}

const TREND_WEIGHT = 0.3;

const INJURY_PENALTY: Record<Exclude<InjuryStatus, null>, number> = {
  OUT: 9999, // effectively removes them from consideration
  DOUBTFUL: 9,
  QUESTIONABLE: 3.5,
  MONITOR: 1,
};


export function scorePlayer(input: {
  name: string;
  pos: string;
  team: string;
  wk1_pts: number | null;
  wk2_pts: number | null;
  avg_pts: number;
  injuryStatus?: InjuryStatus;
  injuryNote?: string;
}): ScoredPlayer {
  // Trend is the difference between Week 2 and Week 1 points, if both are available.
  const trend =
    input.wk1_pts != null && input.wk2_pts != null ? input.wk2_pts - input.wk1_pts : 0;
  const injuryStatus = input.injuryStatus ?? null;
  const penalty = injuryStatus ? INJURY_PENALTY[injuryStatus] : 0;
  const score = Math.round((input.avg_pts + trend * TREND_WEIGHT - penalty) * 100) / 100;

  // Reasons are a human-readable explanation of the score, shown in the UI.
  const reasons: string[] = [
    `${input.avg_pts.toFixed(1)} pts/game average`,
  ];
  if (trend !== 0) {
    reasons.push(
      `${trend > 0 ? "trending up" : "trending down"} ${Math.abs(trend).toFixed(1)} pts week-over-week`
    );
  }
  if (injuryStatus) {
    reasons.push(`${injuryStatus.toLowerCase()} - ${input.injuryNote ?? "injury risk"}`);
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
    injuryStatus,
    injuryNote: input.injuryNote,
    score,
    recommendation,
    reasons,
  };
}

export function compare(
  a: Parameters<typeof scorePlayer>[0],
  b: Parameters<typeof scorePlayer>[0]
): { winner: ScoredPlayer; loser: ScoredPlayer; margin: number } {
  const sa = scorePlayer(a);
  const sb = scorePlayer(b);
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
  injuryStatus?: InjuryStatus;
  injuryNote?: string;
}): TradeValuedPlayer {
  const multiplier = POSITION_MULTIPLIER[input.pos] ?? 1;
  const injuryStatus = input.injuryStatus ?? null;
  const discount = injuryStatus ? TRADE_INJURY_DISCOUNT[injuryStatus] : 0;
  const value = Math.max(0, Math.round((input.avg_pts * multiplier - discount) * 100) / 100);

  const reasons: string[] = [
    `${input.avg_pts.toFixed(1)} pts/game x ${multiplier.toFixed(2)} ${input.pos} scarcity`,
  ];
  if (injuryStatus) {
    reasons.push(`-${discount.toFixed(2)} for ${injuryStatus.toLowerCase()} status (${input.injuryNote ?? "injury risk"})`);
  }

  return {
    playerId: input.playerId,
    name: input.name,
    pos: input.pos,
    team: input.team,
    avg_pts: input.avg_pts,
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
