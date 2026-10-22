export interface PlayerProjection {
  playerId: string;
  predictedMu: number;    // Expected mean points
  predictedSigma: number; // Uncertainty (std dev)
}

export interface SimulationResult {
  winProbability: number;
  myTeam: { floorP10: number; medianP50: number; ceilingP90: number };
  oppTeam: { floorP10: number; medianP50: number; ceilingP90: number };
}

// Box-Muller transform for standard normal random numbers
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

export function runMonteCarloMatchup(
  myRoster: PlayerProjection[],
  oppRoster: PlayerProjection[],
  simulations: number = 10000
): SimulationResult {
  let myWins = 0;
  const myTotals: number[] = new Array(simulations).fill(0);
  const oppTotals: number[] = new Array(simulations).fill(0);

  for (let i = 0; i < simulations; i++) {
    let mySimScore = 0;
    let oppSimScore = 0;

    for (const player of myRoster) {
      mySimScore += Math.max(0, randomNormal(player.predictedMu, player.predictedSigma));
    }
    for (const player of oppRoster) {
      oppSimScore += Math.max(0, randomNormal(player.predictedMu, player.predictedSigma));
    }

    myTotals[i] = mySimScore;
    oppTotals[i] = oppSimScore;

    if (mySimScore > oppSimScore) {
      myWins++;
    }
  }

  // Sort results to extract quantiles
  myTotals.sort((a, b) => a - b);
  oppTotals.sort((a, b) => a - b);

  const getPercentile = (arr: number[], pct: number) =>
    arr[Math.floor(simulations * pct)];

  return {
    winProbability: parseFloat((myWins / simulations).toFixed(4)),
    myTeam: {
      floorP10: parseFloat(getPercentile(myTotals, 0.10).toFixed(2)),
      medianP50: parseFloat(getPercentile(myTotals, 0.50).toFixed(2)),
      ceilingP90: parseFloat(getPercentile(myTotals, 0.90).toFixed(2)),
    },
    oppTeam: {
      floorP10: parseFloat(getPercentile(oppTotals, 0.10).toFixed(2)),
      medianP50: parseFloat(getPercentile(oppTotals, 0.50).toFixed(2)),
      ceilingP90: parseFloat(getPercentile(oppTotals, 0.90).toFixed(2)),
    },
  };
}