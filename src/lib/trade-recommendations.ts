import { evaluateTrade, type InjuryStatus } from "@/lib/scoring";
import type { InjuryRow, PlayerRow } from "@/lib/types";

export interface RecommendationRoster {
  memberId: string;
  leagueId: string;
  leagueName: string;
  teamName: string;
  profileId: string;
  players: PlayerRow[];
}

export interface RecommendedTrade {
  key: string;
  leagueId: string;
  leagueName: string;
  otherTeamName: string;
  giving: PlayerRow;
  receiving: PlayerRow;
  percentDiff: number;
  reason: string;
}

const STARTER_NEEDS: Record<string, number> = {
  QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1,
};

const DEPTH_SURPLUS: Record<string, number> = {
  QB: 2, RB: 4, WR: 4, TE: 2, K: 2, DST: 2,
};

function countsByPosition(players: PlayerRow[]) {
  return players.reduce<Record<string, number>>((counts, player) => {
    counts[player.pos] = (counts[player.pos] ?? 0) + 1;
    return counts;
  }, {});
}

function toTradeInput(player: PlayerRow, injuries: Map<string, InjuryRow>) {
  const injury = injuries.get(player.name.toLowerCase());
  return {
    playerId: player.id,
    name: player.name,
    pos: player.pos,
    team: player.team,
    avg_pts: player.avg_pts,
    injuryStatus: (injury?.status as InjuryStatus) ?? null,
    injuryNote: injury?.note ?? undefined,
  };
}

export function recommendTrades(
  rosters: RecommendationRoster[],
  injuryRows: InjuryRow[],
  currentProfileId: string,
): RecommendedTrade[] {
  const injuryByName = new Map(injuryRows.map((injury) => [injury.name.toLowerCase(), injury]));
  const mine = rosters.filter((roster) => roster.profileId === currentProfileId);
  const opponents = rosters.filter((roster) => roster.profileId !== currentProfileId);
  const recommendations: RecommendedTrade[] = [];

  for (const myRoster of mine) {
    const myCounts = countsByPosition(myRoster.players);
    for (const opponent of opponents.filter((roster) => roster.leagueId === myRoster.leagueId)) {
      const opponentCounts = countsByPosition(opponent.players);
      for (const giving of myRoster.players) {
        if ((myCounts[giving.pos] ?? 0) <= (DEPTH_SURPLUS[giving.pos] ?? 1)) continue;
        if ((opponentCounts[giving.pos] ?? 0) >= (STARTER_NEEDS[giving.pos] ?? 0)) continue;

        for (const receiving of opponent.players) {
          if (giving.pos === receiving.pos) continue;
          if ((opponentCounts[receiving.pos] ?? 0) <= (DEPTH_SURPLUS[receiving.pos] ?? 1)) continue;
          if ((myCounts[receiving.pos] ?? 0) >= (STARTER_NEEDS[receiving.pos] ?? 0)) continue;

          const evaluation = evaluateTrade(
            [toTradeInput(giving, injuryByName)],
            [toTradeInput(receiving, injuryByName)],
          );
          if (evaluation.verdict !== "FAIR") continue;

          const key = `${myRoster.leagueId}:${opponent.memberId}:${giving.id}:${receiving.id}`;
          recommendations.push({
            key,
            leagueId: myRoster.leagueId,
            leagueName: myRoster.leagueName,
            otherTeamName: opponent.teamName,
            giving,
            receiving,
            percentDiff: evaluation.percentDiff,
            reason: `You have extra ${giving.pos} depth and need ${receiving.pos}; ${opponent.teamName} has the reverse roster fit.`,
          });
        }
      }
    }
  }

  return recommendations
    .sort((a, b) => Math.abs(a.percentDiff) - Math.abs(b.percentDiff))
    .slice(0, 3);
}
