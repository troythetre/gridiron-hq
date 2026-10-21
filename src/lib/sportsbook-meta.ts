/*
 * Client-safe sportsbook metadata: labels, a distinct accent color per
 * book, and a logo URL. Deliberately has ZERO imports from server-only
 * code (no next/headers, no Supabase server client) so it is safe for
 * both "use client" components and server components to import - see
 * src/lib/sportsbook-links.ts for the server-only counterpart (the DB
 * query for a user's linked/preferred sportsbooks), which is kept in a
 * separate file for the same reason parlay-account.ts / parlay-format.ts
 * were split earlier.
 *
 * Logos use Google's public favicon endpoint (no API key, no signup).
 * Clearbit's free logo API has been shut down, and logo.dev now requires
 * an account/token, so this is the most reliable unauthenticated source
 * available. <SportsbookLogo> below falls back to an initials badge if a
 * domain's favicon ever fails to load.
 *
 * NOTE: the colors below are a hand-picked palette chosen so eleven books
 * are visually distinguishable at a glance in a dense comparison grid.
 * They are NOT each brand's official hex code - just a stable, distinct
 * color assigned per sportsbook id.
 */

export type SportsbookId =
  | "fanduel"
  | "draftkings"
  | "betmgm"
  | "caesars"
  | "fanatics"
  | "betrivers"
  | "bet365"
  | "espnbet"
  | "hardrockbet"
  | "prizepicks"
  | "underdog";

export type SportsbookMeta = {
  id: SportsbookId;
  label: string;
  domain: string;
  color: string;
};

export const SPORTSBOOKS: SportsbookMeta[] = [
  { id: "fanduel", label: "FanDuel", domain: "fanduel.com", color: "#2E7DFF" },
  { id: "draftkings", label: "DraftKings", domain: "draftkings.com", color: "#3CB043" },
  { id: "betmgm", label: "BetMGM", domain: "betmgm.com", color: "#D4AF37" },
  { id: "caesars", label: "Caesars", domain: "caesars.com", color: "#9B59B6" },
  { id: "fanatics", label: "Fanatics", domain: "fanatics.com", color: "#E63946" },
  { id: "betrivers", label: "BetRivers", domain: "betrivers.com", color: "#06B6D4" },
  { id: "bet365", label: "bet365", domain: "bet365.com", color: "#FFB703" },
  { id: "espnbet", label: "ESPN BET", domain: "espnbet.com", color: "#FB5607" },
  { id: "hardrockbet", label: "Hard Rock", domain: "hardrockbet.com", color: "#FF006E" },
  { id: "prizepicks", label: "PrizePicks", domain: "prizepicks.com", color: "#8AC926" },
  { id: "underdog", label: "Underdog", domain: "underdogfantasy.com", color: "#118AB2" },
];

const BY_ID: Record<string, SportsbookMeta> = Object.fromEntries(
  SPORTSBOOKS.map((book) => [book.id, book])
);

/** Looks up a sportsbook's metadata by its SportsGameOdds bookmaker id.
 * Unknown ids (new/unmapped books) get a generated fallback so the UI
 * never breaks on a book we haven't added to the list above yet. */
export function sportsbookMeta(id: string): SportsbookMeta {
  const known = BY_ID[id.toLowerCase()];
  if (known) return known;

  return {
    id: id as SportsbookId,
    label: id
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    domain: "",
    // Deterministic fallback color so an unknown book is still
    // consistently colored across renders instead of flickering.
    color: `hsl(${(hashString(id) % 360)}, 55%, 55%)`,
  };
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function sportsbookLabel(id: string): string {
  return sportsbookMeta(id).label;
}

export function sportsbookColor(id: string): string {
  return sportsbookMeta(id).color;
}

/** Google's public, unauthenticated favicon service. Returns null for
 * sportsbooks with no known domain (unmapped ids). */
export function sportsbookLogoUrl(id: string): string | null {
  const domain = sportsbookMeta(id).domain;
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
