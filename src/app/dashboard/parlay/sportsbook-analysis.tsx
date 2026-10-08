"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  CircleAlert,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";

type League = "NFL" | "CFB";

type Book = {
  odds?: string;
  spread?: string;
  overUnder?: string;
  line?: string;
  available?: boolean;
  deeplink?: string;
  lastUpdatedAt?: string;
};

type Market = {
  oddID?: string;
  marketName?: string;
  statID?: string;
  statEntityID?: string;
  periodID?: string;
  betTypeID?: string;
  sideID?: string;
  fairOdds?: string;
  bookOdds?: string;
  fairSpread?: string;
  bookSpread?: string;
  fairOverUnder?: string;
  bookOverUnder?: string;
  byBookmaker?: Record<string, Book>;
};

type Event = {
  eventID: string;
  leagueID?: string;
  startsAt?: string;
  startTime?: string;
  status?: {
    live?: boolean;
    started?: boolean;
    ended?: boolean;
    displayLong?: string;
  };
  teams?: {
    home?: {
      name?: string;
      names?: {
        long?: string;
        short?: string;
      };
    };
    away?: {
      name?: string;
      names?: {
        long?: string;
        short?: string;
      };
    };
  };
  odds?: Record<string, Market>;
};

/*
 * Display names for the bookmakers returned by SportsGameOdds.
 * Unknown bookmaker IDs are formatted automatically by bookName().
 */
const BOOK_LABELS: Record<string, string> = {
  fanduel: "FanDuel",
  draftkings: "DraftKings",
  betmgm: "BetMGM",
  caesars: "Caesars",
  fanatics: "Fanatics",
  betrivers: "BetRivers",
  bet365: "bet365",
  espnbet: "ESPN BET",
  hardrockbet: "Hard Rock",
  prizepicks: "PrizePicks",
  underdog: "Underdog",
};

function bookName(id: string) {
  return (
    BOOK_LABELS[id.toLowerCase()] ??
    id
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

/*
 * Convert an American-odds string into a number.
 * Examples:
 *   "-470" -> -470
 *   "+360" -> 360
 */
function americanNumber(value?: string) {
  if (!value) return null;

  const cleaned = value.replace("+", "");
  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function formatPrice(value?: string) {
  if (!value) return "—";

  const number = americanNumber(value);

  if (number == null) return value;

  return number > 0 ? `+${number}` : `${number}`;
}

/*
 * Extract the actual market line from a bookmaker.
 *
 * Moneyline markets don't have a point line, so their discrepancy
 * is evaluated using priceRange() instead.
 */
function extractLine(market: Market, book: Book) {
  if (market.betTypeID === "ml") {
    return null;
  }

  return (
    book.spread ??
    book.overUnder ??
    book.line ??
    market.bookSpread ??
    market.bookOverUnder ??
    null
  );
}

function marketLabel(market: Market) {
  if (market.marketName) {
    return market.marketName;
  }

  if (market.betTypeID === "ml") {
    return `Moneyline · ${market.sideID ?? ""}`;
  }

  if (market.betTypeID === "sp") {
    return `Spread · ${market.sideID ?? ""}`;
  }

  if (market.betTypeID === "ou") {
    return `Total · ${market.sideID ?? ""}`;
  }

  return market.oddID ?? "Market";
}

function marketGroupLabel(market: Market) {
  if (market.betTypeID === "ml") return "MONEYLINE";
  if (market.betTypeID === "sp") return "SPREAD";
  if (market.betTypeID === "ou") return "TOTAL";
  return "MARKET";
}

function lineNumber(value?: string | null) {
  if (!value) return null;

  const number = Number(
    String(value).replace(/[^\d.+-]/g, "")
  );

  return Number.isFinite(number) ? number : null;
}

/*
 * Calculates the difference between the highest and lowest
 * available sportsbook line for the same market.
 */
function discrepancy(market: Market) {
  const books = Object.entries(
    market.byBookmaker ?? {}
  ).filter(([, book]) => book.available !== false);

  const lines = books
    .map(([, book]) =>
      lineNumber(extractLine(market, book))
    )
    .filter(
      (value): value is number =>
        value != null
    );

  if (lines.length < 2) return null;

  return Math.max(...lines) - Math.min(...lines);
}

/*
 * Calculates the difference between the best and worst
 * American odds available across sportsbooks.
 */
function priceRange(market: Market) {
  const prices = Object.values(
    market.byBookmaker ?? {}
  )
    .filter((book) => book.available !== false)
    .map((book) => americanNumber(book.odds))
    .filter(
      (value): value is number =>
        value != null
    );

  if (prices.length < 2) return null;

  return Math.max(...prices) - Math.min(...prices);
}

/*
 * Sportsbook Analysis does not currently receive official team
 * logo/image URLs from the event response, so we use compact
 * team initials rather than inventing external image URLs.
 */
function teamMark(name: string) {
  const words = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function shortTeamName(name: string) {
  return name
    .replace(/ University$/i, "")
    .replace(/ State$/i, " St.")
    .replace(/ College$/i, "")
    .trim();
}

export function SportsbookAnalysis() {
  const [league, setLeague] = useState<League>("NFL");
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] =
    useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  /*
   * Single event-loading function.
   *
   * The previous implementation had both loadEvents() and another
   * nearly identical fetch inside useEffect. Keeping one function
   * avoids duplicate requests and makes refresh behavior consistent.
   */
  async function loadEvents() {
    try {
      setRefreshing(true);
      setError("");

      const response = await fetch(
        `/api/betting/events?league=${league}`,
        {
          cache: "no-store",
        }
      );

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        events?: Event[];
      };

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            "Unable to load sportsbook data."
        );
      }

      const nextEvents = data.events ?? [];

      setEvents(nextEvents);

      /*
       * Keep the currently selected game when possible.
       * Otherwise select the first available event.
       */
      setSelectedEvent((current) => {
        if (
          current &&
          nextEvents.some(
            (event) =>
              event.eventID === current.eventID
          )
        ) {
          return current;
        }

        return nextEvents[0] ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sportsbook data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /*
   * Load data whenever the selected league changes.
   */
  useEffect(() => {
    void loadEvents();
    // loadEvents intentionally responds to league changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league]);

  /*
   * Filter the game rail using both home and away team names.
   */
  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return events;

    return events.filter((event) => {
      const home =
        event.teams?.home?.names?.long ??
        event.teams?.home?.name ??
        "";

      const away =
        event.teams?.away?.names?.long ??
        event.teams?.away?.name ??
        "";

      return `${away} ${home}`
        .toLowerCase()
        .includes(query);
    });
  }, [events, search]);

  /*
   * Only display full-game moneyline, spread, and total markets.
   */
  const markets = useMemo(() => {
    if (!selectedEvent?.odds) return [];

    return Object.values(selectedEvent.odds)
      .filter((market) => {
        if (
          market.periodID &&
          market.periodID !== "game"
        ) {
          return false;
        }

        return (
          market.betTypeID === "ml" ||
          market.betTypeID === "sp" ||
          market.betTypeID === "ou"
        );
      })
      .slice(0, 18);
  }, [selectedEvent]);

  /*
   * Find the market with the largest sportsbook discrepancy.
   */
  const strongestDiscrepancy = useMemo(() => {
    return markets
      .map((market) => ({
        market,
        difference: discrepancy(market) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.difference - a.difference
      )[0];
  }, [markets]);

  const home =
    selectedEvent?.teams?.home?.names?.long ??
    selectedEvent?.teams?.home?.name ??
    "Home";

  const away =
    selectedEvent?.teams?.away?.names?.long ??
    selectedEvent?.teams?.away?.name ??
    "Away";

  return (
    <section className="space-y-4">
      {/* =====================================================
          SPORTSBOOK ANALYSIS HEADER
          ===================================================== */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0d]">

        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">
                <Activity className="h-3.5 w-3.5" />
                Market intelligence
              </div>

              <h2 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Sportsbook Analysis
              </h2>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
                Compare the same market across sportsbooks.
                Find line gaps, price discrepancies, and the
                strongest available number.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadEvents()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh lines
            </button>
          </div>

          {/* League switch */}
          <div className="mt-4 flex w-fit gap-1 rounded-xl border border-white/10 bg-black p-1">
            {(["NFL", "CFB"] as League[]).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLeague(item)}
                  className={`rounded-lg px-5 py-2 text-[10px] font-black transition ${
                    league === item
                      ? "bg-white text-black"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>
        </div>

        {/* =====================================================
            SEARCH
            ===================================================== */}
        <div className="border-b border-white/10 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={`Search ${league} games...`}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#111114] pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/20"
            />
          </div>
        </div>

        {/* =====================================================
            GAME RAIL + ANALYSIS
            ===================================================== */}
        <div className="grid lg:grid-cols-[250px_1fr]">

          {/* ---------------------------------------------------
              GAME RAIL
              --------------------------------------------------- */}
          <aside className="border-b border-white/10 lg:border-b-0 lg:border-r">

            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                Games
              </span>

              <span className="text-[10px] font-bold text-zinc-600">
                {filteredEvents.length}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-xl bg-white/[0.03]"
                    />
                  )
                )}
              </div>
            ) : error ? (
              <div className="p-5 text-xs text-red-400">
                {error}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-5 text-xs text-zinc-600">
                No games with available odds.
              </div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto p-2">

                {filteredEvents.map((event) => {
                  const eventHome =
                    event.teams?.home?.names?.long ??
                    event.teams?.home?.name ??
                    "Home";

                  const eventAway =
                    event.teams?.away?.names?.long ??
                    event.teams?.away?.name ??
                    "Away";

                  const active =
                    event.eventID ===
                    selectedEvent?.eventID;

                  const eventMarkets =
                    Object.values(
                      event.odds ?? {}
                    );

                  const bookCount = new Set(
                    eventMarkets.flatMap(
                      (market) =>
                        Object.entries(
                          market.byBookmaker ?? {}
                        )
                          .filter(
                            ([, book]) =>
                              book.available !== false
                          )
                          .map(([book]) => book)
                    )
                  ).size;

                  return (
                    <button
                      key={event.eventID}
                      type="button"
                      onClick={() =>
                        setSelectedEvent(event)
                      }
                      className={`mb-1.5 w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-white/15 bg-white/[0.07]"
                          : "border-transparent hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">

                        <span className="text-[8px] font-black uppercase tracking-wider text-zinc-600">
                          {event.status?.live
                            ? "LIVE"
                            : "UPCOMING"}
                        </span>

                        <span className="text-[8px] text-zinc-600">
                          {bookCount} books
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="truncate text-xs font-bold text-white">
                          {eventAway}
                        </div>

                        <div className="truncate text-xs font-bold text-zinc-400">
                          {eventHome}
                        </div>
                      </div>

                      <div className="mt-2 text-[8px] text-zinc-600">
                        {event.startsAt
                          ? new Date(
                              event.startsAt
                            ).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Start time unavailable"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* ---------------------------------------------------
              MAIN ANALYSIS
              --------------------------------------------------- */}
          <main className="min-w-0">

            {!selectedEvent ? (
              <div className="grid min-h-[400px] place-items-center p-8 text-center">
                <div>
                  <BarChart3 className="mx-auto h-8 w-8 text-zinc-700" />

                  <p className="mt-3 text-sm font-bold text-zinc-500">
                    Select a game
                  </p>

                  <p className="mt-1 text-xs text-zinc-700">
                    We&apos;ll compare every available book.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* =================================================
                    COMPACT MATCHUP HEADER

                    The matchup identifies the game but stays
                    intentionally compact so the sportsbook data
                    remains the primary content.
                    ================================================= */}
                <div className="border-b border-white/10 bg-[#0b0b0d] px-5 py-4 sm:px-6">

                  <div className="flex items-center justify-between gap-4">

                    {/* Event status */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-zinc-600">

                        {selectedEvent.status?.live && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        )}

                        {selectedEvent.status?.live
                          ? "Live market"
                          : "Upcoming market"}
                      </div>

                      <div className="mt-1 truncate text-[9px] font-bold text-zinc-700">
                        {selectedEvent.startsAt
                          ? new Date(
                              selectedEvent.startsAt
                            ).toLocaleString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "Start time unavailable"}
                      </div>
                    </div>

                    {/* Biggest discrepancy */}
                    {strongestDiscrepancy &&
                      strongestDiscrepancy.difference > 0 && (
                        <div className="shrink-0 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">

                          <div className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-600">
                            Biggest line gap
                          </div>

                          <div className="mt-0.5 flex items-baseline gap-1">
                            <TrendingUp className="h-3 w-3 text-zinc-500" />

                            <span className="text-base font-black text-white">
                              {strongestDiscrepancy.difference.toFixed(
                                1
                              )}
                            </span>

                            <span className="text-[8px] text-zinc-600">
                              pts
                            </span>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* ------------------------------------------------
                      MATCHUP
                      ------------------------------------------------ */}
                  <div className="mt-4 flex items-center justify-center">

                    {/* Away */}
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-3">

                      <div className="text-right">
                        <div className="truncate text-sm font-black text-white sm:text-base">
                          {shortTeamName(away)}
                        </div>

                        <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-zinc-700">
                          Away
                        </div>
                      </div>

                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-white">
                        {teamMark(away)}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="mx-4 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-black text-[7px] font-black text-zinc-600">
                      VS
                    </div>

                    {/* Home */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">

                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-white">
                        {teamMark(home)}
                      </div>

                      <div className="text-left">
                        <div className="truncate text-sm font-black text-white sm:text-base">
                          {shortTeamName(home)}
                        </div>

                        <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-zinc-700">
                          Home
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =================================================
                    MARKET ROWS
                    ================================================= */}
                <div className="divide-y divide-white/10">

                  {markets.map((market, index) => {
                    const books = Object.entries(
                      market.byBookmaker ?? {}
                    ).filter(
                      ([, book]) =>
                        book.available !== false
                    );

                    if (books.length === 0) {
                      return null;
                    }

                    const lineGap =
                      discrepancy(market);

                    const priceGap =
                      priceRange(market);

                    const lineValues = books
                      .map(([, book]) =>
                        lineNumber(
                          extractLine(
                            market,
                            book
                          )
                        )
                      )
                      .filter(
                        (
                          value
                        ): value is number =>
                          value != null
                      );

                    const minLine =
                      lineValues.length
                        ? Math.min(
                            ...lineValues
                          )
                        : null;

                    const maxLine =
                      lineValues.length
                        ? Math.max(
                            ...lineValues
                          )
                        : null;

                    return (
                      <div
                        key={
                          market.oddID ??
                          `${market.betTypeID}-${market.sideID}-${index}`
                        }
                        className="px-4 py-4 sm:px-5"
                      >

                        {/* Market heading */}
                        <div className="flex flex-wrap items-center justify-between gap-3">

                          <div>
                            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">
                              {marketGroupLabel(
                                market
                              )}
                            </div>

                            <div className="mt-1 text-sm font-bold text-white">
                              {marketLabel(market)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">

                            {lineGap != null &&
                              lineGap > 0 && (
                                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[8px] font-black text-zinc-300">
                                  LINE GAP{" "}
                                  {lineGap.toFixed(1)}
                                </span>
                              )}

                            {priceGap != null &&
                              priceGap >= 10 && (
                                <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[8px] font-black text-zinc-300">
                                  PRICE GAP{" "}
                                  {Math.round(
                                    priceGap
                                  )}
                                </span>
                              )}
                          </div>
                        </div>

                        {/* ------------------------------------------------
                            VISUAL LINE RANGE

                            This makes the discrepancy tangible rather
                            than presenting only a number.
                            ------------------------------------------------ */}
                        {minLine != null &&
                          maxLine != null &&
                          minLine !== maxLine && (
                            <div className="mt-4">

                              <div className="relative h-1 rounded-full bg-white/[0.06]">

                                <div className="absolute inset-y-0 left-0 w-full rounded-full bg-white/20" />

                                <div className="absolute -top-1.5 left-0 h-4 w-1 rounded-full bg-white" />

                                <div className="absolute -top-1.5 right-0 h-4 w-1 rounded-full bg-zinc-500" />
                              </div>

                              <div className="mt-2 flex justify-between text-[8px] font-bold text-zinc-700">
                                <span>{minLine}</span>
                                <span>{maxLine}</span>
                              </div>
                            </div>
                          )}

                        {/* ------------------------------------------------
                            SPORTSBOOK COMPARISON CARDS
                            ------------------------------------------------ */}
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">

                          {books.map(
                            ([bookId, book]) => {
                              const line =
                                extractLine(
                                  market,
                                  book
                                );

                              const numericLine =
                                lineNumber(
                                  line
                                );

                              const isHighest =
                                numericLine !=
                                  null &&
                                maxLine !=
                                  null &&
                                numericLine ===
                                  maxLine;

                              const isLowest =
                                numericLine !=
                                  null &&
                                minLine !=
                                  null &&
                                numericLine ===
                                  minLine;

                              return (
                                <div
                                  key={bookId}
                                  className={`rounded-xl border p-3 transition ${
                                    isHighest ||
                                    isLowest
                                      ? "border-white/15 bg-white/[0.045]"
                                      : "border-white/[0.06] bg-[#111114]"
                                  }`}
                                >

                                  <div className="flex items-center justify-between">

                                    <span className="truncate text-[10px] font-black text-zinc-300">
                                      {bookName(
                                        bookId
                                      )}
                                    </span>

                                    <div className="flex items-center gap-1">

                                      {isHighest &&
                                        lineGap !=
                                          null &&
                                        lineGap > 0 && (
                                          <ArrowUp className="h-3 w-3 text-white" />
                                        )}

                                      {isLowest &&
                                        lineGap !=
                                          null &&
                                        lineGap > 0 && (
                                          <ArrowDown className="h-3 w-3 text-zinc-700" />
                                        )}
                                    </div>
                                  </div>

                                  <div className="mt-2 flex items-end justify-between gap-3">

                                    <div>
                                      {line ? (
                                        <div className="text-xl font-black text-white">
                                          {line}
                                        </div>
                                      ) : (
                                        <div className="text-xl font-black text-white">
                                          {formatPrice(
                                            book.odds
                                          )}
                                        </div>
                                      )}

                                      {line &&
                                        book.odds && (
                                          <div className="mt-0.5 text-[10px] font-bold text-zinc-600">
                                            {formatPrice(
                                              book.odds
                                            )}
                                          </div>
                                        )}
                                    </div>

                                    <span
                                      className={`rounded-md px-2 py-1 text-[8px] font-black ${
                                        isHighest
                                          ? "bg-white text-black"
                                          : "bg-white/[0.05] text-zinc-600"
                                      }`}
                                    >
                                      {isHighest
                                        ? "TOP"
                                        : "LINE"}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* =================================================
                    EXPLANATION
                    ================================================= */}
                <div className="border-t border-white/10 bg-white/[0.015] p-4 sm:p-5">
                  <div className="flex gap-3">

                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />

                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                        What you&apos;re seeing
                      </div>

                      <p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-600">
                        A line discrepancy means sportsbooks
                        are offering different numbers on the
                        same market. This is not a prediction
                        that a wager will win. Gridiron HQ uses
                        the discrepancy as an analytical signal
                        for the parlay engine.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </section>
  );
}