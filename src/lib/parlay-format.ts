import type { SavedParlayRow } from "@/lib/types";

/*
 * Pure, client-safe helpers for displaying saved parlays - deliberately
 * kept out of src/lib/parlay-account.ts, which imports the server-only
 * Supabase client (next/headers). parlay-account-view.tsx is a "use
 * client" component; if it imported these from the same file as
 * getSavedParlays(), that server-only import would get pulled into the
 * browser bundle and next/headers would break at build time. Anything
 * here must stay free of server-only imports.
 */

export type ParlayAccountStats = {
  totalSaved: number;
  pendingCount: number;
  wonCount: number;
  lostCount: number;
  voidCount: number;
  winRate: number | null;
  totalStaked: number;
  totalWon: number;
  netProfit: number | null;
  biggestWin: SavedParlayRow | null;
  lowestOddsWin: SavedParlayRow | null;
};

/** Derives the account's headline stats from its saved parlays. Settlement is
 * user-marked for now (there's no live score feed wired up to auto-settle),
 * so these numbers only reflect parlays the bettor has tagged won/lost/void. */
export function computeAccountStats(parlays: SavedParlayRow[]): ParlayAccountStats {
  const won = parlays.filter((parlay) => parlay.status === "won");
  const lost = parlays.filter((parlay) => parlay.status === "lost");
  const voided = parlays.filter((parlay) => parlay.status === "void");
  const settledCount = won.length + lost.length;

  const totalStaked = parlays.reduce((sum, parlay) => sum + Number(parlay.stake), 0);
  const totalWon = won.reduce((sum, parlay) => sum + Number(parlay.actual_payout ?? 0), 0);
  const stakedOnWon = won.reduce((sum, parlay) => sum + Number(parlay.stake), 0);
  const stakedOnLost = lost.reduce((sum, parlay) => sum + Number(parlay.stake), 0);

  const biggestWin = won.length
    ? won.reduce((best, parlay) =>
        Number(parlay.actual_payout ?? 0) > Number(best.actual_payout ?? 0) ? parlay : best)
    : null;
  const lowestOddsWin = won.length
    ? won.reduce((best, parlay) => {
        const candidate = parlay.combined_odds_decimal ?? Infinity;
        const current = best.combined_odds_decimal ?? Infinity;
        return candidate < current ? parlay : best;
      })
    : null;

  return {
    totalSaved: parlays.length,
    pendingCount: parlays.filter((parlay) => parlay.status === "pending").length,
    wonCount: won.length,
    lostCount: lost.length,
    voidCount: voided.length,
    winRate: settledCount > 0 ? (won.length / settledCount) * 100 : null,
    totalStaked,
    totalWon,
    netProfit: settledCount > 0 ? (totalWon - stakedOnWon) - stakedOnLost : null,
    biggestWin,
    lowestOddsWin,
  };
}

/** American-odds string for a parlay's stored decimal odds, e.g. "+350". */
export function decimalOddsToAmerican(decimal: number | null): string {
  if (decimal == null || decimal <= 1) return "—";
  const american = decimal >= 2 ? (decimal - 1) * 100 : -100 / (decimal - 1);
  return `${american > 0 ? "+" : ""}${Math.round(american)}`;
}

/** Short "Bills -3.5 + Chiefs ML + ..." summary of a parlay's legs. */
export function summarizeLegs(legs: SavedParlayRow["legs"], max = 3): string {
  const names = legs.map((leg) => leg.selection || leg.event).filter(Boolean);
  if (names.length <= max) return names.join(" + ");
  return `${names.slice(0, max).join(" + ")} +${names.length - max} more`;
}
