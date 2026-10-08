export interface RawGameLog {
  playerId: string;
  fantasyPoints: number;
  targets: number;
  snapPct: number;
  oppDefRank: number; // 1 (toughest) to 32 (easiest)
  vegasImpliedTotal: number;
}

export interface MLFeatures {
  playerId: string;
  ewmaPoints3w: number;
  ewmaTargets3w: number;
  ewmaSnapPct: number;
  matchupLeverage: number;
  impliedScriptRatio: number;
}

/**
  Calculates Exponentially Weighted Moving Average with a given alpha span
 */
function calculateEWMA(values: number[], span: number = 3): number {
  if (values.length === 0) return 0;
  const alpha = 2 / (span + 1);
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = alpha * values[i] + (1 - alpha) * ewma;
  }
  return ewma;
}

export function extractMLFeatures(history: RawGameLog[]): MLFeatures {
  const points = history.map((h) => h.fantasyPoints);
  const targets = history.map((h) => h.targets);
  const snaps = history.map((h) => h.snapPct);
  
  const latestLog = history[history.length - 1];

  const ewmaTargets3w = calculateEWMA(targets, 3);

  return {
    playerId: latestLog.playerId,
    ewmaPoints3w: calculateEWMA(points, 3),
    ewmaTargets3w,
    ewmaSnapPct: calculateEWMA(snaps, 3),
    // Matchup interaction term
    matchupLeverage: ewmaTargets3w * (33.0 - latestLog.oppDefRank),
    // Game script factor normalized to league baseline (21.5 pts)
    impliedScriptRatio: latestLog.vegasImpliedTotal / 21.5,
  };
}
