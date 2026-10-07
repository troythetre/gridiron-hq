import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ESPN_API = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";

export type EspnPlayer = { espn_player_id: string; name: string; pos: string; team: string | null };
export type EspnRoster = {
  league_id: string;
  league_name: string;
  team_name: string;
  wins: number;
  losses: number;
  ties: number;
  roster_json: EspnPlayer[];
};
type EspnTeam = {
  id: number;
  name?: string;
  abbrev?: string;
  owners?: string[];
  record?: { overall?: { wins?: number; losses?: number; ties?: number } };
  roster?: { entries?: Array<{ playerPoolEntry?: { id?: number; player?: { fullName?: string; firstName?: string; lastName?: string; defaultPositionId?: number; proTeamId?: number } } }> };
};
type EspnLeague = { id?: number; settings?: { name?: string }; teams?: EspnTeam[] };

const positions: Record<number, string> = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
const teams: Record<number, string> = {
  1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET", 9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR", 15: "MIA", 16: "MIN", 17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC", 25: "SF", 26: "SEA", 27: "TB", 28: "WAS", 29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
};

function encryptionKey() {
  const raw = process.env.ESPN_COOKIE_ENCRYPTION_KEY;
  if (!raw) throw new Error("ESPN private sync needs ESPN_COOKIE_ENCRYPTION_KEY configured on the server.");
  const key = /^[a-f\d]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ESPN_COOKIE_ENCRYPTION_KEY must encode exactly 32 bytes (64 hex characters or base64).");
  return key;
}

export function encryptEspnCookies(value: { swid: string; espnS2: string }) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}

export function decryptEspnCookies(value: { cookie_ciphertext: string; cookie_iv: string; cookie_tag: string }) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(value.cookie_iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.cookie_tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.cookie_ciphertext, "base64")), decipher.final()]).toString("utf8")) as { swid: string; espnS2: string };
}

export function currentEspnSeason() {
  const now = new Date();
  return now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear();
}

export async function fetchEspnRoster(leagueId: string, season: number, swid: string, espnS2: string, teamId?: string): Promise<EspnRoster> {
  const url = `${ESPN_API}/${season}/segments/0/leagues/${encodeURIComponent(leagueId)}?view=mTeam&view=mRoster`;
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { Cookie: `SWID=${swid}; espn_s2=${espnS2}`, Accept: "application/json" },
    });
  } catch {
    throw new Error("Couldn't reach ESPN. Try again in a moment.");
  }
  if (response.status === 401 || response.status === 403) throw new Error("ESPN rejected the session cookies. Refresh them in ESPN and reconnect.");
  if (response.status === 404) throw new Error("League not found for that ID and season.");
  if (!response.ok) throw new Error(`ESPN returned an error (${response.status}).`);
  const league = await response.json() as EspnLeague;
  if (!Array.isArray(league.teams) || !league.teams.length) throw new Error("ESPN returned no teams. Check the league ID and season.");

  const normalizedSwid = swid.replace(/[{}]/g, "").toLowerCase();
  const ownTeam = league.teams.find((team) => team.owners?.some((owner) => owner.replace(/[{}]/g, "").toLowerCase() === normalizedSwid));
  const selectedTeam = teamId ? league.teams.find((team) => String(team.id) === teamId) : ownTeam;
  if (!selectedTeam) throw new Error("Couldn't match your ESPN account to a league team. Check SWID, or provide your ESPN team ID.");

  const roster = (selectedTeam.roster?.entries ?? []).flatMap((entry) => {
    const player = entry.playerPoolEntry?.player;
    const id = entry.playerPoolEntry?.id;
    if (!player || id == null) return [];
    return [{ espn_player_id: String(id), name: player.fullName ?? ([player.firstName, player.lastName].filter(Boolean).join(" ") || `ESPN player ${id}`), pos: positions[player.defaultPositionId ?? -1] ?? "?", team: teams[player.proTeamId ?? -1] ?? null }];
  });
  const record = selectedTeam.record?.overall;
  return {
    league_id: String(league.id ?? leagueId),
    league_name: league.settings?.name ?? "ESPN Fantasy League",
    team_name: selectedTeam.name ?? selectedTeam.abbrev ?? `ESPN team ${selectedTeam.id}`,
    wins: record?.wins ?? 0,
    losses: record?.losses ?? 0,
    ties: record?.ties ?? 0,
    roster_json: roster,
  };
}
