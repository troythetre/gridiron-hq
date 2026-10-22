import { getSportsGameOddsEvents, type SportsGameOddsMarket } from "@/lib/sports-game-odds";

// Live sportsbook game lines (spread/total) for this week's NFL slate, via
// the SportsGameOdds API this app already has a key and types for
// (src/lib/sports-game-odds.ts, which bounds its own fetch with a timeout).
// Surfaced as market context next to this platform's own per-player
// projections on the Weekly predictions tab.
//
// This intentionally stops at game-level lines, not individual player
// props: the feed's player-prop markets are keyed by an opaque
// `statEntityID` with no guaranteed, documented mapping to this platform's
// player records, and shipping a comparison grid built on an unverified
// name match would risk showing confidently wrong numbers. That's disclosed
// in the UI rather than faked.

type TeamRef = { name?: string; names?: { long?: string; short?: string } };

export type WeeklyGameLine = {
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string | null;
  spread: string | null;
  total: string | null;
};

export type WeeklyGameLines = {
  games: WeeklyGameLine[];
  lastUpdated: string | null;
  error: string | null;
};

function teamName(team: TeamRef | undefined): string {
  return team?.names?.long ?? team?.name ?? "TBD";
}

function findMarketLine(odds: Record<string, SportsGameOddsMarket> | undefined, pattern: RegExp, field: "spread" | "total") {
  if (!odds) return null;
  for (const market of Object.values(odds)) {
    if (!market.marketName || !pattern.test(market.marketName)) continue;
    const line = field === "spread"
      ? market.bookSpread ?? market.fairSpread
      : market.bookOverUnder ?? market.fairOverUnder;
    if (line) return line;
  }
  return null;
}

export async function getWeeklyGameLines(): Promise<WeeklyGameLines> {
  try {
    const events = await getSportsGameOddsEvents("NFL");

    const games: WeeklyGameLine[] = events.map((event) => ({
      eventId: event.eventID,
      homeTeam: teamName(event.teams?.home),
      awayTeam: teamName(event.teams?.away),
      startsAt: event.startsAt ?? event.startTime ?? null,
      spread: findMarketLine(event.odds, /spread/i, "spread"),
      total: findMarketLine(event.odds, /total|over.?under/i, "total"),
    })).filter((game) => game.spread != null || game.total != null);

    if (games.length === 0) throw new Error("No game lines were available in this week's odds feed.");

    return { games, lastUpdated: new Date().toISOString(), error: null };
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Sportsbook odds did not respond in time."
      : error instanceof Error
        ? error.message
        : "Could not load live market lines.";
    return { games: [], lastUpdated: null, error: message };
  }
}
