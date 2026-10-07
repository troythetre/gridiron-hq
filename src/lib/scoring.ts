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
  const trend =
    input.wk1_pts != null && input.wk2_pts != null ? input.wk2_pts - input.wk1_pts : 0;
  const injuryStatus = input.injuryStatus ?? null;
  const penalty = injuryStatus ? INJURY_PENALTY[injuryStatus] : 0;
  const score = Math.round((input.avg_pts + trend * TREND_WEIGHT - penalty) * 100) / 100;

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
