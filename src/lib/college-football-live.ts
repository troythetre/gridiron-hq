export type CollegeFootballRanking = {
  rank: number;
  previousRank: number | null;
  team: string;
  record: string;
  logo: string | null;
};

export type CollegeFootballRankings = {
  poll: string;
  headline: string;
  week: string;
  lastUpdated: string | null;
  teams: CollegeFootballRanking[];
  sourceUrl: string;
  error: string | null;
};

type EspnRankingFeed = {
  rankings?: Array<{
    id?: string;
    type?: string;
    name?: string;
    headline?: string;
    date?: string;
    lastUpdated?: string;
    occurrence?: { displayValue?: string };
    ranks?: Array<{
      current?: number;
      previous?: number;
      recordSummary?: string;
      team?: {
        location?: string;
        nickname?: string;
        displayName?: string;
        logo?: string;
      };
    }>;
  }>;
};

const RANKINGS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/college-football/rankings";
const RANKINGS_SOURCE_URL = "https://www.espn.com/college-football/rankings";

export async function getCollegeFootballRankings(): Promise<CollegeFootballRankings> {
  try {
    const response = await fetch(RANKINGS_URL, {
      next: { revalidate: 3600, tags: ["college-football-rankings"] },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`ESPN rankings returned HTTP ${response.status}`);
    }

    const feed = (await response.json()) as EspnRankingFeed;
    const poll =
      feed.rankings?.find((ranking) => ranking.type === "ap" || ranking.id === "1") ??
      feed.rankings?.[0];
    const teams =
      poll?.ranks?.flatMap((rank) => {
        const name =
          rank.team?.displayName ??
          [rank.team?.location, rank.team?.nickname].filter(Boolean).join(" ");
        if (rank.current == null || !name) return [];
        return [{
          rank: rank.current,
          previousRank: rank.previous ?? null,
          team: name,
          record: rank.recordSummary ?? "Record unavailable",
          logo: rank.team?.logo ?? null,
        }];
      }) ?? [];

    if (!poll || teams.length === 0) {
      throw new Error("ESPN rankings response did not contain a ranked poll.");
    }

    return {
      poll: poll.name ?? "AP Top 25",
      headline: poll.headline ?? "Latest AP Top 25",
      week: poll.occurrence?.displayValue ?? "Latest poll",
      lastUpdated: poll.lastUpdated ?? poll.date ?? null,
      teams,
      sourceUrl: RANKINGS_SOURCE_URL,
      error: null,
    };
  } catch (error) {
    return {
      poll: "AP Top 25",
      headline: "Latest college football rankings",
      week: "Unavailable",
      lastUpdated: null,
      teams: [],
      sourceUrl: RANKINGS_SOURCE_URL,
      error:
        error instanceof Error
          ? error.message
          : "Could not load college football rankings.",
    };
  }
}
