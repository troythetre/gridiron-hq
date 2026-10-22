"use client";

import Link from "next/link";
import { ArrowRight, Check, Plus, Ticket } from "lucide-react";
import { addParlayLeg, isLegInSlip, useParlaySlip, type ParlayLeg } from "@/lib/parlay-slip";
import type { WeeklyGameLine } from "@/lib/weekly-game-lines";

// Turns this week's live game lines into a clickable "biggest favorites"
// list that copies straight into the existing parlay slip
// (src/lib/parlay-slip.ts) - the same localStorage-backed slip the
// Parlay page's bet-slip editor reads. "Favorite" here means the largest-
// magnitude spread on the board this week - a simple, disclosed ranking,
// not a win-probability model. No price/odds accompany these lines (the
// feed only exposes the spread/total number, not a priced side), so each
// leg's odds field is left blank rather than invented.

function favoriteRank(line: WeeklyGameLine): number | null {
  if (!line.spread) return null;
  const parsed = Number.parseFloat(line.spread);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

function legFor(line: WeeklyGameLine): Omit<ParlayLeg, "id"> {
  return {
    event: `${line.awayTeam} @ ${line.homeTeam}`,
    selection: `Spread ${line.spread}`,
    // This feed exposes the spread/total number only, not a priced side,
    // so odds is left blank rather than invented - same convention the
    // manual leg editor uses for a freshly added empty leg. The parlay
    // builder already shows "-" for payout/odds until a real number is
    // typed in, so this degrades the same way, not with a crash or NaN.
    odds: "",
  };
}

export function WeeklyFavoritesParlay({ games }: { games: WeeklyGameLine[] }) {
  const { legs } = useParlaySlip();

  const favorites = games
    .map((game) => ({ game, rank: favoriteRank(game) }))
    .filter((entry): entry is { game: WeeklyGameLine; rank: number } => entry.rank != null)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 5)
    .map((entry) => entry.game);

  if (favorites.length === 0) return null;

  const addAll = () => {
    for (const game of favorites) {
      const leg = legFor(game);
      if (!isLegInSlip(legs, leg.event, leg.selection)) addParlayLeg(leg);
    }
  };

  const allAdded = favorites.every((game) => {
    const leg = legFor(game);
    return isLegInSlip(legs, leg.event, leg.selection);
  });

  return <div className="space-y-2 rounded-xl border border-border bg-background/20 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><Ticket className="h-3.5 w-3.5" />This week&apos;s biggest favorites</p>
      <button
        type="button"
        onClick={addAll}
        disabled={allAdded}
        className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary transition hover:bg-primary/20 disabled:cursor-default disabled:border-border disabled:bg-transparent disabled:text-muted"
      >
        {allAdded ? <><Check className="h-3 w-3" />All added</> : <><Plus className="h-3 w-3" />Add all {favorites.length} to parlay</>}
      </button>
    </div>
    <div className="space-y-1.5">
      {favorites.map((game) => {
        const leg = legFor(game);
        const added = isLegInSlip(legs, leg.event, leg.selection);
        return <div key={game.eventId} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs">
          <div className="min-w-0">
            <p className="truncate font-bold">{game.awayTeam} @ {game.homeTeam}</p>
            <p className="text-[11px] text-muted">Spread {game.spread}{game.total ? ` · O/U ${game.total}` : ""}</p>
          </div>
          <button
            type="button"
            onClick={() => addParlayLeg(leg)}
            disabled={added}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition disabled:cursor-default
              border-primary/40 bg-primary/10 text-primary hover:bg-primary/20
              disabled:border-border disabled:bg-transparent disabled:text-muted"
          >
            {added ? <><Check className="h-3 w-3" />Added</> : <><Plus className="h-3 w-3" />Add</>}
          </button>
        </div>;
      })}
    </div>
    <Link href="/dashboard/parlay" className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
      Open parlay builder <ArrowRight className="h-3 w-3" />
    </Link>
  </div>;
}
