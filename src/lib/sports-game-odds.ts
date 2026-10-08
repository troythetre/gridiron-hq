const API_BASE_URL = "https://api.sportsgameodds.com/v2";

export type SportsGameOddsBook = {
  odds?: string;
  spread?: string;
  overUnder?: string;
  line?: string;
  available?: boolean;
  deeplink?: string;
  lastUpdatedAt?: string;
};

export type SportsGameOddsMarket = {
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
  byBookmaker?: Record<string, SportsGameOddsBook>;
};

export type SportsGameOddsEvent = {
  eventID: string;
  leagueID?: string;
  startsAt?: string;
  startTime?: string;

  status?: {
    started?: boolean;
    completed?: boolean;
    cancelled?: boolean;
    ended?: boolean;
    live?: boolean;
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

  odds?: Record<string, SportsGameOddsMarket>;
};

type SportsGameOddsResponse = {
  success: boolean;
  data?: SportsGameOddsEvent[];
  error?: string;
  nextCursor?: string;
};

export async function getSportsGameOddsEvents(
  leagueID: "NFL" | "NCAAF"
) {
  const apiKey = process.env.SPORTSGAMEODDS_API_KEY;

  if (!apiKey) {
    throw new Error("SPORTSGAMEODDS_API_KEY is not configured.");
  }

  const params = new URLSearchParams({
    leagueID,
    oddsAvailable: "true",
    limit: "25",
  });

  const response = await fetch(
    `${API_BASE_URL}/events?${params.toString()}`,
    {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      next: {
        revalidate: 30,
      },
    }
  );

  const payload =
    (await response.json()) as SportsGameOddsResponse;

  if (!response.ok || !payload.success) {
    throw new Error(
      payload.error ||
        `SportsGameOdds returned HTTP ${response.status}`
    );
  }

  return payload.data ?? [];
}
