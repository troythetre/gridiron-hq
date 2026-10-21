// Live NFL standings, fetched the same way college-football-live.ts fetches
// CFB rankings: ESPN's public, unauthenticated site API, cached via Next's
// fetch revalidation, with a fully-populated error fallback so a shape
// change upstream degrades this one section instead of breaking the page.

export type NflStandingsTeam = {
  team: string;
  wins: number;
  losses: number;
  ties: number;
  winPercent: number | null;
  logo: string | null;
};

export type NflStandingsGroup = {
  name: string;
  teams: NflStandingsTeam[];
};

export type NflStandings = {
  groups: NflStandingsGroup[];
  lastUpdated: string | null;
  sourceUrl: string;
  error: string | null;
};

const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/football/nfl/standings";
const STANDINGS_SOURCE_URL = "https://www.espn.com/nfl/standings";

type EspnStatEntry = { name?: string; abbreviation?: string; value?: number; displayValue?: string };
type EspnStandingsEntry = {
  team?: { displayName?: string; location?: string; nickname?: string; logos?: { href?: string }[] };
  stats?: EspnStatEntry[];
};
type EspnStandingsFeed = {
  children?: Array<{
    name?: string;
    standings?: { entries?: EspnStandingsEntry[] };
  }>;
};

function statValue(stats: EspnStatEntry[] | undefined, names: string[]): number | null {
  if (!stats) return null;
  for (const name of names) {
    const match = stats.find((stat) => stat.name === name || stat.abbreviation === name);
    if (match?.value != null && Number.isFinite(match.value)) return match.value;
  }
  return null;
}

export async function getNflStandings(): Promise<NflStandings> {
  try {
    const response = await fetch(STANDINGS_URL, {
      next: { revalidate: 3600, tags: ["nfl-standings"] },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`ESPN standings returned HTTP ${response.status}`);

    const feed = (await response.json()) as EspnStandingsFeed;
    const groups: NflStandingsGroup[] = (feed.children ?? []).flatMap((conference) => {
      const entries = conference.standings?.entries ?? [];
      const teams = entries.flatMap((entry) => {
        const name = entry.team?.displayName ?? [entry.team?.location, entry.team?.nickname].filter(Boolean).join(" ");
        if (!name) return [];
        const wins = statValue(entry.stats, ["wins", "W"]) ?? 0;
        const losses = statValue(entry.stats, ["losses", "L"]) ?? 0;
        const ties = statValue(entry.stats, ["ties", "T"]) ?? 0;
        return [{
          team: name,
          wins,
          losses,
          ties,
          winPercent: statValue(entry.stats, ["winPercent"]),
          logo: entry.team?.logos?.[0]?.href ?? null,
        }];
      });
      if (teams.length === 0) return [];
      teams.sort((a, b) => (b.winPercent ?? 0) - (a.winPercent ?? 0));
      return [{ name: conference.name ?? "Conference", teams }];
    });

    if (groups.length === 0) throw new Error("ESPN standings response did not contain any teams.");

    return { groups, lastUpdated: new Date().toISOString(), sourceUrl: STANDINGS_SOURCE_URL, error: null };
  } catch (error) {
    return {
      groups: [],
      lastUpdated: null,
      sourceUrl: STANDINGS_SOURCE_URL,
      error: error instanceof Error ? error.message : "Could not load live NFL standings.",
    };
  }
}
