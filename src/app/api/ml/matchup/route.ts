import { NextResponse } from "next/server";
import { extractMLFeatures } from "@/lib/ml/featureEngine";
import {
  runMonteCarloMatchup,
  PlayerProjection,
} from "@/lib/ml/monteCarlo";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      myRosterHistory: Parameters<typeof extractMLFeatures>[0][];
      oppRosterHistory: Parameters<typeof extractMLFeatures>[0][];
    };

    const {
      myRosterHistory,
      oppRosterHistory,
    } = body;

    // 1. Transform raw game logs into ML feature sets
    const myFeatures =
      myRosterHistory.map(extractMLFeatures);

    const oppFeatures =
      oppRosterHistory.map(extractMLFeatures);

    // 2. Perform inference
    const computeProjection = (
      feat: ReturnType<typeof extractMLFeatures>
    ): PlayerProjection => {
      const predictedMu =
        0.45 * feat.ewmaPoints3w +
        0.30 * feat.matchupLeverage +
        0.25 *
          (feat.ewmaSnapPct *
            15 *
            feat.impliedScriptRatio);

      const predictedSigma =
        feat.ewmaSnapPct > 0.65
          ? predictedMu * 0.28
          : predictedMu * 0.50;

      return {
        playerId: feat.playerId,
        predictedMu: Math.max(
          0,
          parseFloat(predictedMu.toFixed(2))
        ),
        predictedSigma: Math.max(
          1.5,
          parseFloat(predictedSigma.toFixed(2))
        ),
      };
    };

    const myProjections =
      myFeatures.map(computeProjection);

    const oppProjections =
      oppFeatures.map(computeProjection);

    // 3. Run Monte Carlo simulation
    const simulationResults =
      runMonteCarloMatchup(
        myProjections,
        oppProjections,
        10000
      );

    return NextResponse.json({
      success: true,
      myProjections,
      oppProjections,
      simulationResults,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "ML matchup analysis failed.",
      },
      { status: 500 }
    );
  }
}
