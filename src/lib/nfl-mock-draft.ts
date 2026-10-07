export type NflMockDraftPick = {
  pick: number;
  team: string;
  teamAbbreviation: string;
  player: string;
  position: string;
  college: string;
};

export type NflMockDraft = {
  title: string;
  updated: string | null;
  picks: NflMockDraftPick[];
  sourceUrl: string;
  error: string | null;
};

const MOCK_DRAFT_URL = "https://www.tankathon.com/nfl/mock-draft";

function normalizedPlayerName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function findNflMockDraftPick(data: NflMockDraft | null, playerName: string) {
  const normalizedName = normalizedPlayerName(playerName);
  if (!data || !normalizedName) return null;
  return data.picks.find((pick) => normalizedPlayerName(pick.player) === normalizedName) ?? null;
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function teamName(slug: string) {
  const names: Record<string, string> = {
    "49ers": "San Francisco 49ers",
    buccaneers: "Tampa Bay Buccaneers",
    commanders: "Washington Commanders",
    chargers: "Los Angeles Chargers",
    chiefs: "Kansas City Chiefs",
    packers: "Green Bay Packers",
    patriots: "New England Patriots",
    raiders: "Las Vegas Raiders",
    rams: "Los Angeles Rams",
    texans: "Houston Texans",
    titans: "Tennessee Titans",
  };
  return names[slug] ??
    slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
}

export function parseNflMockDraft(html: string): NflMockDraft {
  const updated =
    html.match(/Player Rankings updated\s*([^<\n]+)/i)?.[1]?.trim() ?? null;
  const rows = html.split(/<div class="mock-row nfl">/i).slice(1);
  const picks = rows.flatMap((row): NflMockDraftPick[] => {
    const pick = Number(row.match(/class="mock-row-pick-number">\s*(\d+)/i)?.[1]);
    const teamMatch = row.match(
      /class="mock-row-logo">[\s\S]*?<a href="\/nfl\/([^"]+)">[\s\S]*?<img[^>]*alt="([^"]*)"/i,
    );
    const player =
      row.match(/class="mock-row-name">\s*([^<]+)</i)?.[1]?.trim() ?? "";
    const details =
      row.match(/class="mock-row-school-position">\s*([^<]+)</i)?.[1]?.trim() ?? "";
    const [position = "", college = ""] = details.split("|").map((part) => part.trim());
    if (!Number.isInteger(pick) || !teamMatch || !player) return [];

    const abbreviation = decodeHtml(teamMatch[2]).trim();
    return [{
      pick,
      team: teamName(teamMatch[1]),
      teamAbbreviation: abbreviation,
      player: decodeHtml(player),
      position,
      college: decodeHtml(college),
    }];
  });

  return {
    title: html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? "NFL Mock Draft",
    updated,
    picks,
    sourceUrl: MOCK_DRAFT_URL,
    error: picks.length > 0 ? null : "The source did not return any mock-draft picks.",
  };
}

export async function getNflMockDraft(): Promise<NflMockDraft> {
  try {
    const response = await fetch(MOCK_DRAFT_URL, {
      next: { revalidate: 3600, tags: ["nfl-mock-draft"] },
      headers: { Accept: "text/html" },
    });
    if (!response.ok) {
      throw new Error(`Tankathon mock draft returned HTTP ${response.status}`);
    }

    return parseNflMockDraft(await response.text());
  } catch (error) {
    return {
      title: "NFL Mock Draft",
      updated: null,
      picks: [],
      sourceUrl: MOCK_DRAFT_URL,
      error:
        error instanceof Error
          ? error.message
          : "Could not load the latest NFL mock draft.",
    };
  }
}
