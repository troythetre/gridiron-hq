"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { cfbLogoUrl } from "@/lib/cfb-logos";
import {
  SPORTSBOOKS,
  sportsbookLabel as bookName,
  sportsbookColor,
  sportsbookLogoUrl,
  type SportsbookMeta,
} from "@/lib/sportsbook-meta";
import { isLegInSlip, removeParlayLeg, type ParlayLeg } from "@/lib/parlay-slip";
import { linkSportsbook, unlinkSportsbook } from "@/app/actions/sportsbook-links";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  ChevronRight,
  CircleAlert,
  RefreshCw,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

type League = "NFL" | "CFB";

/*
 * How many recent refreshes' worth of a single book's line we keep in
 * memory for the "line detail" sparkline. At the 60s auto-refresh
 * interval this is roughly a 20-minute window - a session-local trend,
 * not a persisted long-term history (nothing is stored past a reload).
 */
const HISTORY_LIMIT = 20;

/*
 * Everything the line-detail panel needs about the book/market a user
 * clicked, captured at click time. The live odds snapshot is frozen to
 * that moment (re-opening re-captures it); the session history chart
 * still updates live since it's looked up from state by historyKey.
 */
type DetailLineInfo = {
  eventID: string;
  historyKey: string;
  market: Market;
  book: Book;
  bookId: string;
  eventLabel: string;
  selection: string;
  away: string;
  home: string;
};

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

/*
 * Player props carry a statEntityID (the player the stat belongs to);
 * anything else outside ml/sp/ou is a game-level prop (e.g. team total
 * sacks, first team to score) rather than tied to one player.
 */
function marketGroupLabel(market: Market) {
  if (market.betTypeID === "ml") return "MONEYLINE";
  if (market.betTypeID === "sp") return "SPREAD";
  if (market.betTypeID === "ou") return "TOTAL";
  return market.statEntityID ? "PLAYER PROP" : "GAME PROP";
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
 * The single number a book's card headlines with: the point line when the
 * market has one, otherwise the American price. This is also the value we
 * track across refreshes for the red/green "odds moved" coloring, since
 * it's the number a user is actually looking at.
 */
function primaryValue(market: Market, book: Book): number | null {
  return lineNumber(extractLine(market, book)) ?? americanNumber(book.odds);
}

function marketKey(market: Market, index: number) {
  return market.oddID ?? `${market.betTypeID ?? "market"}-${market.sideID ?? ""}-${market.statID ?? ""}-${index}`;
}

/*
 * Builds a snapshot of every book's primary number across every event, so
 * the next refresh can diff against it and flag what moved. Keyed by
 * event + market + book so unrelated markets never collide.
 */
function buildOddsSnapshot(events: Event[]): Map<string, number> {
  const snapshot = new Map<string, number>();

  for (const event of events) {
    const markets = Object.values(event.odds ?? {});
    markets.forEach((market, index) => {
      const books = Object.entries(market.byBookmaker ?? {});
      for (const [bookId, book] of books) {
        const value = primaryValue(market, book);
        if (value == null) continue;
        snapshot.set(`${event.eventID}:${marketKey(market, index)}:${bookId}`, value);
      }
    });
  }

  return snapshot;
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

/*
 * Turns a market's abstract sideID into a human-readable name for the
 * leg label added to the parlay slip - "home"/"away" become the actual
 * team, "over"/"under" stay as-is, anything else (a specific player
 * side on a prop) is passed through as-is.
 */
function sideTeamName(sideID: string | undefined, awayName: string, homeName: string) {
  if (sideID === "home") return homeName;
  if (sideID === "away") return awayName;
  if (sideID === "over") return "Over";
  if (sideID === "under") return "Under";
  return sideID ?? "";
}

/*
 * Builds the human-readable selection string stored on a parlay leg when
 * a user clicks a sportsbook's line, e.g. "Buffalo Bills -3.5",
 * "Kansas City Chiefs ML", "Over 47.5", or for a prop,
 * "Patrick Mahomes Passing Yards Over 275.5".
 */
function buildLegSelection(market: Market, line: string | null, awayName: string, homeName: string) {
  const side = sideTeamName(market.sideID, awayName, homeName);

  if (market.betTypeID === "ml") {
    return `${side} ML`.trim();
  }

  if (market.betTypeID === "sp") {
    if (line == null) return `${side} spread`.trim();
    const numeric = lineNumber(line);
    const formatted = numeric != null && numeric > 0 ? `+${numeric}` : line;
    return `${side} ${formatted}`.trim();
  }

  if (market.betTypeID === "ou") {
    return `${side} ${line ?? ""}`.trim();
  }

  // Player/game props: lead with the market's own label (it usually
  // already names the stat, e.g. "Patrick Mahomes Passing Yards").
  const label = marketLabel(market);
  return line != null ? `${label} ${side} ${line}`.trim() : `${label} ${side}`.trim();
}

/*
 * NFL team full name -> ESPN's public team-logo CDN slug. ESPN's
 * /i/teamlogos/nfl/500/{slug}.png path is a stable, widely used public
 * asset (no API key, no auth) - this is the same source most third-party
 * fantasy tools pull logos from. College teams are matched separately via
 * cfbLogoUrl() (see src/lib/cfb-logos.ts, imported above) since there are
 * far more of them and the id lookup works differently (numeric ids,
 * substring-matched names rather than exact slugs).
 */
const NFL_LOGO_SLUGS: Record<string, string> = {
  "Arizona Cardinals": "ari",
  "Atlanta Falcons": "atl",
  "Baltimore Ravens": "bal",
  "Buffalo Bills": "buf",
  "Carolina Panthers": "car",
  "Chicago Bears": "chi",
  "Cincinnati Bengals": "cin",
  "Cleveland Browns": "cle",
  "Dallas Cowboys": "dal",
  "Denver Broncos": "den",
  "Detroit Lions": "det",
  "Green Bay Packers": "gb",
  "Houston Texans": "hou",
  "Indianapolis Colts": "ind",
  "Jacksonville Jaguars": "jax",
  "Kansas City Chiefs": "kc",
  "Las Vegas Raiders": "lv",
  "Los Angeles Chargers": "lac",
  "Los Angeles Rams": "lar",
  "Miami Dolphins": "mia",
  "Minnesota Vikings": "min",
  "New England Patriots": "ne",
  "New Orleans Saints": "no",
  "New York Giants": "nyg",
  "New York Jets": "nyj",
  "Philadelphia Eagles": "phi",
  "Pittsburgh Steelers": "pit",
  "San Francisco 49ers": "sf",
  "Seattle Seahawks": "sea",
  "Tampa Bay Buccaneers": "tb",
  "Tennessee Titans": "ten",
  "Washington Commanders": "wsh",
};

function teamLogoUrl(name: string): string | null {
  const slug = NFL_LOGO_SLUGS[name];
  if (slug) return `https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`;
  // Not an exact NFL full-team-name match - try the college football map,
  // which matches by substring since CFB feeds often include the mascot
  // ("Ohio State Buckeyes") where our map keys are just the school name.
  return cfbLogoUrl(name);
}

/*
 * A team's logo badge, falling back to the initials mark when no logo
 * is mapped, or when the mapped logo URL fails to load (a wrong/unmapped
 * id degrades to initials instead of a broken-image icon).
 */
function TeamBadge({ name, size = "h-11 w-11" }: { name: string; size?: string }) {
  const [broken, setBroken] = useState(false);
  const logo = teamLogoUrl(name);
  if (logo && !broken) {
    return (
      <div className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white p-1.5`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- external logo CDN, not an optimizable local asset */}
        <img src={logo} alt={`${name} logo`} className="h-full w-full object-contain" onError={() => setBroken(true)} />
      </div>
    );
  }
  return (
    <div className={`grid ${size} shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-black text-white`}>
      {teamMark(name)}
    </div>
  );
}

/*
 * A sportsbook's logo badge (via Google's public favicon service - see
 * src/lib/sportsbook-meta.ts), falling back to a color-coded initials
 * badge when there's no mapped domain or the favicon fails to load.
 */
function BookLogo({ id, size = "h-5 w-5" }: { id: string; size?: string }) {
  const [broken, setBroken] = useState(false);
  const logo = sportsbookLogoUrl(id);
  const color = sportsbookColor(id);
  if (logo && !broken) {
    return (
      <div className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-md border border-white/10 bg-white`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- external favicon CDN */}
        <img src={logo} alt="" className="h-full w-full object-contain" onError={() => setBroken(true)} />
      </div>
    );
  }
  return (
    <div
      className={`grid ${size} shrink-0 place-items-center rounded-md border border-white/10 text-[7px] font-black text-white`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {bookName(id).slice(0, 2).toUpperCase()}
    </div>
  );
}

/*
 * Toggle chip for tagging a sportsbook as "mine". This is a preference
 * marker only - no credentials are collected and nothing is synced from
 * the real sportsbook. See the sportsbook_links migration for why real
 * account linking isn't offered: no major sportsbook exposes a public
 * API for it, and most explicitly prohibit automated access to personal
 * accounts in their terms of service.
 */
function SportsbookLinkChip({ book, linked }: { book: SportsbookMeta; linked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={linked}
      style={linked ? { borderColor: book.color, backgroundColor: `${book.color}22` } : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition disabled:opacity-50 ${
        linked ? "text-white" : "border-white/10 text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <BookLogo id={book.id} size="h-3.5 w-3.5" />
      {book.label}
      {linked && <Check className="h-3 w-3" />}
    </button>
  );
}

export function SportsbookAnalysis({
  slipLegs = [],
  linkedSportsbookIds = [],
  onAddLeg,
}: {
  slipLegs?: ParlayLeg[];
  linkedSportsbookIds?: string[];
  onAddLeg?: (leg: Omit<ParlayLeg, "id">) => string | null;
} = {}) {
  const [league, setLeague] = useState<League>("NFL");
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] =
    useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [propSearch, setPropSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [oddsDirection, setOddsDirection] = useState<Map<string, "up" | "down">>(new Map());
  const [oddsHistory, setOddsHistory] = useState<Map<string, number[]>>(new Map());
  const [detailLine, setDetailLine] = useState<DetailLineInfo | null>(null);
  const previousOddsRef = useRef<Map<string, number> | null>(null);

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
       * Diff this load's odds against the previous one so book cards can
       * be colored red/green for lines that just moved. Skipped on the
       * very first load - there's nothing yet to compare against.
       */
      const nextSnapshot = buildOddsSnapshot(nextEvents);
      if (previousOddsRef.current) {
        const previous = previousOddsRef.current;
        const directions = new Map<string, "up" | "down">();
        for (const [key, value] of nextSnapshot) {
          const prior = previous.get(key);
          if (prior != null && value !== prior) {
            directions.set(key, value > prior ? "up" : "down");
          }
        }
        setOddsDirection(directions);
      }
      previousOddsRef.current = nextSnapshot;

      /*
       * Append this load's values onto each key's rolling session
       * history, for the line-detail panel's sparkline. Runs on every
       * load, including the first - a one-point history is a valid
       * (if uncharted) starting state.
       */
      setOddsHistory((previous) => {
        const next = new Map(previous);
        for (const [key, value] of nextSnapshot) {
          const existing = next.get(key);
          const appended = existing ? [...existing, value] : [value];
          next.set(
            key,
            appended.length > HISTORY_LIMIT
              ? appended.slice(appended.length - HISTORY_LIMIT)
              : appended
          );
        }
        return next;
      });

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
   * Auto-refresh every 60s so the red/green odds-movement coloring has
   * something to actually track over time, on top of the manual
   * "Refresh lines" button.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      void loadEvents();
    }, 60_000);
    return () => clearInterval(interval);
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
   * Full-game moneyline, spread, and total markets - the primary lines.
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
   * Everything else at the full-game level: player props (statEntityID
   * present) and other game props. SportsGameOdds payloads run
   * 10-15MB and can carry hundreds of these per event, so they're kept
   * in a separate, searchable, capped section rather than dumped
   * alongside the main lines.
   */
  const propMarkets = useMemo(() => {
    if (!selectedEvent?.odds) return [];

    return Object.values(selectedEvent.odds).filter((market) => {
      if (market.periodID && market.periodID !== "game") {
        return false;
      }

      return (
        market.betTypeID !== "ml" &&
        market.betTypeID !== "sp" &&
        market.betTypeID !== "ou"
      );
    });
  }, [selectedEvent]);

  const filteredPropMarkets = useMemo(() => {
    const query = propSearch.trim().toLowerCase();
    const base = query
      ? propMarkets.filter((market) =>
          marketLabel(market).toLowerCase().includes(query)
        )
      : propMarkets;
    return base.slice(0, 60);
  }, [propMarkets, propSearch]);

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
                strongest available number. Click any line to
                add it to your parlay.
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
            YOUR SPORTSBOOKS
            ===================================================== */}
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Your sportsbooks
            </span>
            {SPORTSBOOKS.map((book) => {
              const linked = linkedSportsbookIds.includes(book.id);
              return (
                <form key={book.id} action={linked ? unlinkSportsbook : linkSportsbook}>
                  <input type="hidden" name="sportsbookId" value={book.id} />
                  <SportsbookLinkChip book={book} linked={linked} />
                </form>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-zinc-600">
            Tagging a sportsbook doesn&apos;t connect or sync a real account -
            no sportsbook offers a public API for that, and most prohibit
            automated access to personal accounts in their terms of service.
            This just highlights lines from books that are yours.
          </p>
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
              <div className="p-4">
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-xs leading-5 text-red-300">{error}</p>
                </div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <p className="p-4 text-center text-xs text-zinc-600">
                No games found.
              </p>
            ) : (
              <div className="max-h-[560px] space-y-1.5 overflow-y-auto p-2">
                {filteredEvents.map((event) => {
                  const eventHome =
                    event.teams?.home?.names?.long ??
                    event.teams?.home?.name ??
                    "Home";
                  const eventAway =
                    event.teams?.away?.names?.long ??
                    event.teams?.away?.name ??
                    "Away";
                  const isSelected = selectedEvent?.eventID === event.eventID;

                  return (
                    <button
                      key={event.eventID}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full overflow-hidden rounded-xl border p-2.5 text-left transition ${
                        isSelected
                          ? "border-white/20 bg-white/[0.06]"
                          : "border-white/[0.06] bg-[#111114] hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex shrink-0 -space-x-2">
                          <TeamBadge name={eventAway} size="h-7 w-7" />
                          <TeamBadge name={eventHome} size="h-7 w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-white">
                            {shortTeamName(eventAway)}
                          </div>
                          <div className="truncate text-[10px] font-bold text-zinc-500">
                            @ {shortTeamName(eventHome)}
                          </div>
                        </div>
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
                <div className="relative overflow-hidden border-b border-white/10 bg-[#0b0b0d] px-5 py-4 sm:px-6">

                  {/* Faint team-logo backdrop - "card background should be
                      player background but somewhat opacity" */}
                  {(teamLogoUrl(away) || teamLogoUrl(home)) && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 flex items-center justify-between opacity-[0.07]">
                      {teamLogoUrl(away) && (
                        // eslint-disable-next-line @next/next/no-img-element -- external logo CDN
                        <img src={teamLogoUrl(away)!} alt="" className="h-[220%] w-auto -translate-x-1/4 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      )}
                      {teamLogoUrl(home) && (
                        // eslint-disable-next-line @next/next/no-img-element -- external logo CDN
                        <img src={teamLogoUrl(home)!} alt="" className="h-[220%] w-auto translate-x-1/4 object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      )}
                    </div>
                  )}

                  <div className="relative flex items-center justify-between gap-4">

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
                  <div className="relative mt-4 flex items-center justify-center">

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

                      <TeamBadge name={away} />
                    </div>

                    {/* VS */}
                    <div className="mx-4 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-black text-[7px] font-black text-zinc-600">
                      VS
                    </div>

                    {/* Home */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">

                      <TeamBadge name={home} />

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
                    MAIN MARKET ROWS
                    ================================================= */}
                <div className="divide-y divide-white/10">
                  {markets.map((market, index) => (
                    <MarketRow
                      key={marketKey(market, index)}
                      market={market}
                      index={index}
                      away={away}
                      home={home}
                      eventID={selectedEvent.eventID}
                      slipLegs={slipLegs}
                      linkedSportsbookIds={linkedSportsbookIds}
                      onSelectLine={setDetailLine}
                      oddsDirection={oddsDirection}
                    />
                  ))}
                </div>

                {/* =================================================
                    PLAYER & GAME PROPS
                    ================================================= */}
                {propMarkets.length > 0 && (
                  <>
                    <div className="border-t border-white/10 bg-white/[0.015] px-4 py-3">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
                        Player &amp; game props · {propMarkets.length} available
                      </span>
                      <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                        <input
                          value={propSearch}
                          onChange={(event) => setPropSearch(event.target.value)}
                          placeholder="Search props (e.g. passing yards, receptions)..."
                          className="h-9 w-full rounded-lg border border-white/10 bg-[#111114] pl-9 pr-4 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-white/20"
                        />
                      </div>
                    </div>
                    <div className="divide-y divide-white/10">
                      {filteredPropMarkets.map((market, index) => (
                        <MarketRow
                          key={marketKey(market, index)}
                          market={market}
                          index={index}
                          away={away}
                          home={home}
                          eventID={selectedEvent.eventID}
                          slipLegs={slipLegs}
                          linkedSportsbookIds={linkedSportsbookIds}
                          onSelectLine={setDetailLine}
                          oddsDirection={oddsDirection}
                        />
                      ))}
                      {filteredPropMarkets.length === 0 && (
                        <p className="p-4 text-center text-xs text-zinc-600">
                          No props match &quot;{propSearch}&quot;.
                        </p>
                      )}
                    </div>
                  </>
                )}

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
                        for the parlay engine. Numbers in{" "}
                        <span className="font-bold text-emerald-400">green</span>{" "}
                        moved up and{" "}
                        <span className="font-bold text-red-400">red</span>{" "}
                        moved down since the last refresh.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      {detailLine && (
        <LineDetailPanel
          info={detailLine}
          history={oddsHistory.get(detailLine.historyKey)}
          slipLegs={slipLegs}
          onAddLeg={onAddLeg}
          onClose={() => setDetailLine(null)}
        />
      )}
    </section>
  );
}

/*
 * One market's full row: heading, the visual line-range bar, and every
 * sportsbook's card for that market. Pulled out of the main render so it
 * can be reused for both the primary markets list and the player/game
 * props list without duplicating this (fairly large) block.
 */
function MarketRow({
  market,
  index,
  away,
  home,
  eventID,
  slipLegs,
  linkedSportsbookIds,
  onSelectLine,
  oddsDirection,
}: {
  market: Market;
  index: number;
  away: string;
  home: string;
  eventID: string;
  slipLegs: ParlayLeg[];
  linkedSportsbookIds: string[];
  onSelectLine: (info: DetailLineInfo) => void;
  oddsDirection: Map<string, "up" | "down">;
}) {
  const books = Object.entries(market.byBookmaker ?? {}).filter(
    ([, book]) => book.available !== false
  );

  if (books.length === 0) {
    return null;
  }

  const lineGap = discrepancy(market);
  const priceGap = priceRange(market);

  const lineValues = books
    .map(([, book]) => lineNumber(extractLine(market, book)))
    .filter((value): value is number => value != null);

  const minLine = lineValues.length ? Math.min(...lineValues) : null;
  const maxLine = lineValues.length ? Math.max(...lineValues) : null;

  const eventLabel = `${away} @ ${home}`;

  return (
    <div className="px-3 py-2.5 sm:px-4">

      {/* Market heading */}
      <div className="flex flex-wrap items-center justify-between gap-2">

        <div>
          <div className="text-[7px] font-black uppercase tracking-[0.18em] text-zinc-600">
            {marketGroupLabel(market)}
          </div>

          <div className="mt-0.5 text-xs font-bold text-white">
            {marketLabel(market)}
          </div>
        </div>

        <div className="flex items-center gap-2">

          {lineGap != null && lineGap > 0 && (
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[8px] font-black text-zinc-300">
              LINE GAP {lineGap.toFixed(1)}
            </span>
          )}

          {priceGap != null && priceGap >= 10 && (
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[8px] font-black text-zinc-300">
              PRICE GAP {Math.round(priceGap)}
            </span>
          )}
        </div>
      </div>

      {/* ------------------------------------------------
          VISUAL LINE RANGE

          This makes the discrepancy tangible rather
          than presenting only a number.
          ------------------------------------------------ */}
      {minLine != null && maxLine != null && minLine !== maxLine && (
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

          Compact by design - each card is a summary, not a full
          layout. Clicking one opens the line-detail panel (session
          history chart + a market-wide price comparison + a
          line-shopping verdict), where the actual "add to parlay"
          action lives.
          ------------------------------------------------ */}
      <div className="mt-2.5 grid gap-1.5 sm:grid-cols-3 xl:grid-cols-4">
        {books.map(([bookId, book]) => {
          const line = extractLine(market, book);
          const numericLine = lineNumber(line);

          const isHighest = numericLine != null && maxLine != null && numericLine === maxLine;
          const isLowest = numericLine != null && minLine != null && numericLine === minLine;
          const isLinkedBook = linkedSportsbookIds.includes(bookId);

          const selection = buildLegSelection(market, line, away, home);
          const isAdded = isLegInSlip(slipLegs, eventLabel, selection, bookId);
          const historyKey = `${eventID}:${marketKey(market, index)}:${bookId}`;
          const direction = oddsDirection.get(historyKey);
          const valueColor =
            direction === "up" ? "text-emerald-400" : direction === "down" ? "text-red-400" : "text-white";
          const color = sportsbookColor(bookId);

          return (
            <button
              key={bookId}
              type="button"
              onClick={() =>
                onSelectLine({
                  eventID,
                  historyKey,
                  market,
                  book,
                  bookId,
                  eventLabel,
                  selection,
                  away,
                  home,
                })
              }
              style={{ borderLeftColor: color, borderLeftWidth: 3 }}
              className={`group rounded-lg border p-2 text-left transition hover:border-white/25 hover:bg-white/[0.06] ${
                isHighest || isLowest
                  ? "border-white/15 bg-white/[0.045]"
                  : "border-white/[0.06] bg-[#111114]"
              } ${isLinkedBook ? "ring-1 ring-white/25" : ""}`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex min-w-0 items-center gap-1">
                  <BookLogo id={bookId} size="h-4 w-4" />
                  <span className="truncate text-[9px] font-black text-zinc-300">
                    {bookName(bookId)}
                  </span>
                </span>

                <div className="flex shrink-0 items-center gap-0.5">
                  {isAdded && <Check className="h-3 w-3 text-emerald-400" />}

                  {isHighest && lineGap != null && lineGap > 0 && (
                    <ArrowUp className="h-2.5 w-2.5 text-white" />
                  )}

                  {isLowest && lineGap != null && lineGap > 0 && (
                    <ArrowDown className="h-2.5 w-2.5 text-zinc-700" />
                  )}

                  <ChevronRight className="h-3 w-3 text-zinc-700 opacity-0 transition group-hover:opacity-100" />
                </div>
              </div>

              <div className="mt-1 flex items-end justify-between gap-2">
                <div>
                  <div className={`text-base font-black leading-none transition-colors ${valueColor}`}>
                    {line || formatPrice(book.odds)}
                  </div>

                  {line && book.odds && (
                    <div className="mt-0.5 text-[9px] font-bold text-zinc-600">
                      {formatPrice(book.odds)}
                    </div>
                  )}
                </div>

                {isHighest && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[7px] font-black bg-white text-black">
                    TOP
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/*
 * Derives a line's "line-shopping" read: how its price ranks against
 * every other tracked book offering the same market, plus what its
 * session-local history shows. This is deliberately scoped to price vs.
 * the market and observed movement only - never a read on how the game
 * or player will actually perform, which nothing here claims to predict.
 */
type LineInsight = {
  rank: number;
  totalBooks: number;
  bestBookId: string | null;
  verdict: "best" | "good" | "fair" | "shop" | "unranked";
  verdictLabel: string;
  movementLabel: string;
};

function computeLineInsight(market: Market, bookId: string, history: number[] | undefined): LineInsight {
  const priced = Object.entries(market.byBookmaker ?? {})
    .filter(([, book]) => book.available !== false)
    .map(([id, book]) => ({ id, price: americanNumber(book.odds) }))
    .filter((entry): entry is { id: string; price: number } => entry.price != null)
    .sort((a, b) => b.price - a.price);

  const totalBooks = priced.length;
  const rankIndex = priced.findIndex((entry) => entry.id === bookId);
  const rank = rankIndex >= 0 ? rankIndex + 1 : totalBooks;
  const bestBookId = priced[0]?.id ?? null;

  let verdict: LineInsight["verdict"] = "unranked";
  let verdictLabel = "Price not available for comparison";

  if (totalBooks <= 1) {
    verdict = "unranked";
    verdictLabel = "Only one tracked book has this line";
  } else if (rankIndex === -1) {
    verdict = "unranked";
    verdictLabel = "Price not available for comparison";
  } else if (rank === 1) {
    verdict = "best";
    verdictLabel = "Best price among tracked books";
  } else if (rank / totalBooks <= 0.34) {
    verdict = "good";
    verdictLabel = "Good value — near the top of the market";
  } else if (rank / totalBooks >= 0.67) {
    verdict = "shop";
    verdictLabel = bestBookId
      ? `Shop around — ${bookName(bestBookId)} has a better price`
      : "Shop around — better prices are available elsewhere";
  } else {
    verdict = "fair";
    verdictLabel = "Fair — in line with the rest of the market";
  }

  let movementLabel = "Not enough history yet — check back after the next refresh (~60s)";
  if (history && history.length >= 2) {
    const delta = history[history.length - 1] - history[0];
    let ups = 0;
    let downs = 0;
    for (let i = 1; i < history.length; i += 1) {
      if (history[i] > history[i - 1]) ups += 1;
      else if (history[i] < history[i - 1]) downs += 1;
    }
    if (ups === 0 && downs === 0) {
      movementLabel = `Steady across the last ${history.length} refreshes you've been tracking`;
    } else {
      const direction = delta > 0 ? "up" : delta < 0 ? "down" : "mixed";
      const magnitude = Math.abs(Math.round(delta * 100) / 100);
      movementLabel = `Moved ${direction}${magnitude ? ` ${magnitude}` : ""} since you started tracking — ${ups} up / ${downs} down over ${history.length} refreshes`;
    }
  }

  return { rank, totalBooks, bestBookId, verdict, verdictLabel, movementLabel };
}

const VERDICT_STYLES: Record<LineInsight["verdict"], string> = {
  best: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  good: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
  fair: "border-white/10 bg-white/[0.04] text-zinc-300",
  shop: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  unranked: "border-white/10 bg-white/[0.04] text-zinc-500",
};

/*
 * A minimal inline SVG line chart for a book's session-tracked values -
 * no charting library needed for a single sparkline. Segments are
 * colored green/red by whether that step moved up or down, matching the
 * red/green convention used on the comparison cards.
 */
function Sparkline({ values }: { values: number[] }) {
  const width = 280;
  const height = 64;
  const padding = 6;

  if (values.length < 2) {
    return (
      <div className="grid h-16 place-items-center rounded-lg border border-dashed border-white/10 text-[10px] text-zinc-600">
        Not enough history yet
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (values.length - 1);

  const points = values.map((value, index) => ({
    x: padding + index * stepX,
    y: height - padding - ((value - min) / range) * (height - padding * 2),
  }));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" role="img" aria-label="Line history chart">
      {points.slice(1).map((point, index) => {
        const prev = points[index];
        const up = values[index + 1] > values[index];
        const down = values[index + 1] < values[index];
        const stroke = up ? "#34d399" : down ? "#f87171" : "#71717a";
        return (
          <line
            key={index}
            x1={prev.x}
            y1={prev.y}
            x2={point.x}
            y2={point.y}
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={index === points.length - 1 ? 3 : 1.5}
          fill={index === points.length - 1 ? "#ffffff" : "#52525b"}
        />
      ))}
    </svg>
  );
}

/*
 * The line-detail panel: opens when a user clicks any sportsbook card.
 * Shows how this book's number compares to every other tracked book for
 * the same market (a bar list), how it has moved this session (the
 * sparkline above), a line-shopping verdict derived from both, and the
 * explicit "add to parlay" action - replacing the old direct-click-to-add
 * behavior so a user sees the context before committing a leg.
 */
function LineDetailPanel({
  info,
  history,
  slipLegs,
  onAddLeg,
  onClose,
}: {
  info: DetailLineInfo;
  history?: number[];
  slipLegs: ParlayLeg[];
  onAddLeg?: (leg: Omit<ParlayLeg, "id">) => string | null;
  onClose: () => void;
}) {
  const { market, book, bookId, eventLabel, selection, away, home } = info;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const line = extractLine(market, book);
  const insight = computeLineInsight(market, bookId, history);

  const compareBooks = Object.entries(market.byBookmaker ?? {})
    .filter(([, b]) => b.available !== false)
    .map(([id, b]) => ({ id, price: americanNumber(b.odds), value: primaryValue(market, b) }))
    .filter((entry): entry is { id: string; price: number | null; value: number } => entry.value != null)
    .sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));

  const compareValues = compareBooks.map((entry) => entry.value);
  const compareMin = compareValues.length ? Math.min(...compareValues) : 0;
  const compareMax = compareValues.length ? Math.max(...compareValues) : 0;
  const compareRange = compareMax - compareMin || 1;

  const existingLeg = slipLegs.find(
    (leg) => leg.event === eventLabel && leg.selection === selection && leg.book === bookId
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-4 backdrop-blur-sm sm:place-items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-[#0b0b0d] p-5 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <BookLogo id={bookId} size="h-7 w-7" />
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-white">{bookName(bookId)}</div>
              <div className="truncate text-[10px] font-bold text-zinc-500">
                {shortTeamName(away)} @ {shortTeamName(home)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close line detail"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-600">
            {marketGroupLabel(market)}
          </div>
          <div className="mt-1 text-sm font-bold text-white">{marketLabel(market)}</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-black text-white">{line || formatPrice(book.odds)}</span>
            {line && book.odds && (
              <span className="pb-0.5 text-xs font-bold text-zinc-500">{formatPrice(book.odds)}</span>
            )}
          </div>
          <div className="mt-1 text-[10px] text-zinc-600">{selection}</div>
        </div>

        {/* Session history chart */}
        <div className="mt-4">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
            This session &middot; {bookName(bookId)}
          </div>
          <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <Sparkline values={history ?? []} />
          </div>
        </div>

        {/* Market comparison bars */}
        {compareBooks.length > 1 && (
          <div className="mt-4">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
              Across {compareBooks.length} tracked books
            </div>
            <div className="mt-2 space-y-1.5">
              {compareBooks.map((entry) => {
                const widthPct = Math.max(
                  8,
                  ((entry.value - compareMin) / compareRange) * 100
                );
                const isSelf = entry.id === bookId;
                return (
                  <div key={entry.id} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 truncate text-[9px] font-bold text-zinc-500">
                      {bookName(entry.id)}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className={`h-full rounded-full ${isSelf ? "ring-1 ring-white/60" : ""}`}
                        style={{ width: `${widthPct}%`, backgroundColor: sportsbookColor(entry.id) }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[9px] font-bold text-zinc-400">
                      {entry.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insight */}
        <div className="mt-4 space-y-2">
          <div className={`rounded-lg border px-3 py-2 text-xs font-bold ${VERDICT_STYLES[insight.verdict]}`}>
            {insight.verdictLabel}
            {insight.totalBooks > 1 && (
              <span className="ml-1 font-normal opacity-70">
                ({insight.rank} of {insight.totalBooks} by price)
              </span>
            )}
          </div>
          <p className="text-[10px] leading-4 text-zinc-500">{insight.movementLabel}</p>
          <p className="flex gap-1.5 text-[9px] leading-4 text-zinc-600">
            <TrendingUp className="mt-0.5 h-3 w-3 shrink-0" />
            Reflects this book&apos;s price against other tracked books and its own recent movement only —
            not a prediction of how the game or player will perform.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {existingLeg ? (
            <button
              type="button"
              onClick={() => removeParlayLeg(existingLeg.id)}
              className="flex-1 rounded-full border border-red-400/30 px-4 py-2.5 text-xs font-black text-red-300 hover:bg-red-400/10"
            >
              Remove from parlay
            </button>
          ) : (
            <button
              type="button"
              disabled={!onAddLeg}
              onClick={() => {
                onAddLeg?.({ event: eventLabel, selection, odds: formatPrice(book.odds), book: bookId });
                onClose();
              }}
              className="flex-1 rounded-full bg-white px-4 py-2.5 text-xs font-black text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              Add to parlay
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
