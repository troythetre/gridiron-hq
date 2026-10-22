/**
 * College football team name -> ESPN's internal numeric team ID, used to
 * build logo URLs at https://a.espncdn.com/i/teamlogos/ncaa/500/{id}.png
 * (the same public, unauthenticated CDN pattern used for NFL logos
 * elsewhere in the app). IDs were verified against ESPN's own team page
 * URLs (espn.com/college-football/team/_/id/{id}/{slug}) via web search,
 * not pulled from memory - if any single team's crest ever looks wrong,
 * it's an easy one-line fix here rather than a guess to re-check.
 */
export const CFB_TEAM_LOGO_IDS: Record<string, number> = {
  "Alabama": 333,
  "Arizona": 12,
  "Arizona State": 9,
  "Arkansas": 8,
  "Auburn": 2,
  "Boise State": 68,
  "BYU": 252,
  "Clemson": 228,
  "Colorado": 38,
  "Duke": 150,
  "Florida": 57,
  "Florida State": 52,
  "Georgia": 61,
  "Georgia Tech": 59,
  "Iowa": 2294,
  "Kansas State": 2306,
  "LSU": 99,
  "Louisville": 97,
  "Miami": 2390,
  "Michigan": 130,
  "Missouri": 142,
  "NC State": 152,
  "Nebraska": 158,
  "Notre Dame": 87,
  "Ohio State": 194,
  "Oklahoma": 201,
  "Oklahoma State": 197,
  "Ole Miss": 145,
  "Oregon": 2483,
  "Penn State": 213,
  "Pittsburgh": 221,
  "SMU": 2567,
  "South Carolina": 2579,
  "Tennessee": 2633,
  "Texas": 251,
  "Texas A&M": 245,
  "Texas Tech": 2641,
  "UCF": 2116,
  "UCLA": 26,
  "USC": 30,
  "Utah": 254,
  "Virginia Tech": 259,
  "Washington": 264,
  "West Virginia": 277,
  "Wisconsin": 275,
  "Army": 349,
  "Navy": 2426,
  "South Florida": 58,
};

// Longest name first, so "Texas A&M"/"Texas Tech" match before the shorter
// "Texas", and "Georgia Tech" matches before "Georgia".
const SORTED_KEYS = Object.keys(CFB_TEAM_LOGO_IDS).sort((a, b) => b.length - a.length);

/**
 * Resolves a logo URL from a free-form team name - a live odds feed's
 * "Ohio State Buckeyes" as well as a plain "Ohio State" both match, via
 * substring search, since upstream team-name formatting isn't consistent.
 * Returns null when nothing in the map matches.
 */
export function cfbLogoUrl(name: string): string | null {
  const normalized = name.toLowerCase();
  const key = SORTED_KEYS.find((candidate) => normalized.includes(candidate.toLowerCase()));
  return key ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${CFB_TEAM_LOGO_IDS[key]}.png` : null;
}
