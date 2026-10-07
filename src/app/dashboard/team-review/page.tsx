import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getInjuries, getPlayers, getWaiverPicks } from "@/lib/data";
import type { SleeperRosterRow, InjuryRow, PlayerRow, WaiverPickRow } from "@/lib/types";
import { PlayerAvatar } from "@/components/player-avatar";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, ShieldAlert, Target, TrendingUp } from "lucide-react";

type RosterPlayer = { name: string; pos: string; team: string | null };
type TeamRoster = { id: string; platform: "ESPN" | "Sleeper"; teamName: string; leagueName: string; wins: number; losses: number; ties: number; players: RosterPlayer[] };
type EnrichedPlayer = { roster: RosterPlayer; player?: PlayerRow; injury?: InjuryRow };

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"];
const DEPTH_TARGETS: Record<string, number> = { QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DST: 1 };

function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function TeamReview({ team, players, injuries, waiverPicks }: { team: TeamRoster; players: PlayerRow[]; injuries: InjuryRow[]; waiverPicks: WaiverPickRow[] }) {
  const playerByName = new Map(players.map((player) => [normalizeName(player.name), player]));
  const injuryByName = new Map(injuries.map((injury) => [normalizeName(injury.name), injury]));
  const roster: EnrichedPlayer[] = team.players.map((rosterPlayer) => ({
    roster: rosterPlayer,
    player: playerByName.get(normalizeName(rosterPlayer.name)),
    injury: injuryByName.get(normalizeName(rosterPlayer.name)),
  }));
  const positionRows = POSITIONS.map((pos) => {
    const group = roster.filter((entry) => normalizePosition(entry.roster.pos) === pos);
    const points = group.reduce((sum, entry) => sum + (entry.player?.avg_pts ?? 0), 0);
    return { pos, count: group.length, points: Math.round(points * 10) / 10, target: DEPTH_TARGETS[pos] };
  });
  const thinPositions = positionRows.filter((row) => row.count < row.target).map((row) => row.pos);
  const rosterNames = new Set(roster.map((entry) => normalizeName(entry.roster.name)));
  const recommendedPicks = waiverPicks
    .filter((pick) => pick.pos && thinPositions.includes(normalizePosition(pick.pos)) && !rosterNames.has(normalizeName(pick.name)))
    .sort((a, b) => (b.pct_rostered_est ?? 0) - (a.pct_rostered_est ?? 0))
    .slice(0, 5);
  const injured = roster.filter((entry) => entry.injury);
  const record = `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ""}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-xl font-bold uppercase">{team.teamName}</h2>
        <Badge variant="outline">{team.leagueName}</Badge>
        <Badge variant="secondary">{team.platform}</Badge>
        <span className="text-sm text-muted">{record}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Roster depth</CardTitle>
            <CardDescription>Player count and season half-PPR production by position. Thin positions are compared with a basic depth target.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {positionRows.map((row) => {
              const isThin = row.count < row.target;
              return <div key={row.pos} className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-3">
                <div className="flex items-center gap-2"><PosBadge pos={row.pos} />{isThin && <ShieldAlert className="h-3.5 w-3.5 text-warning" />}</div>
                <div className="text-right"><p className="text-sm font-semibold">{row.count} players · {row.points.toFixed(1)} PPG</p><p className="text-[10px] text-muted">depth target {row.target}{isThin ? " · needs depth" : " · covered"}</p></div>
              </div>;
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Roster health</CardTitle><CardDescription>Injury exposure on this synced roster.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {injured.length ? injured.map(({ roster: player, injury }) => <div key={player.name} className="flex items-center justify-between gap-2"><span className="text-sm">{player.name}</span><StatusBadge status={injury!.status} /></div>) : <p className="text-sm text-muted">No rostered players currently match the injury report.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Waiver fits</CardTitle><CardDescription>Available targets at your thinner positions.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {recommendedPicks.length ? recommendedPicks.map((pick) => <div key={pick.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"><div className="flex items-center gap-2"><PosBadge pos={pick.pos ?? "?"} /><span className="text-sm font-medium">{pick.name}</span></div><span className="text-xs text-muted">~{pick.pct_rostered_est}% rostered</span></div>) : <p className="text-sm text-muted">No matching waiver targets for {thinPositions.length ? thinPositions.join(", ") : "your current depth"}.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Players on this team</CardTitle><CardDescription>{roster.length} synced roster players · click a player to open their profile</CardDescription></div><TrendingUp className="h-5 w-5 text-muted" /></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {roster.map(({ roster: player, player: rankedPlayer, injury }) => {
            const href = rankedPlayer ? `/dashboard/players/${rankedPlayer.id}` : "/dashboard/search";
            return <Link key={`${player.name}-${player.pos}`} href={href} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/30 p-2.5 transition hover:border-primary/40 hover:bg-background/70">
              <PlayerAvatar name={player.name} team={player.team ?? "FA"} position={player.pos} size={48} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{player.name}</span><span className="mt-1 flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-[10px] text-muted">{player.team ?? "FA"}{rankedPlayer ? ` · ${rankedPlayer.avg_pts.toFixed(1)} PPG` : ""}</span></span></span>
              {injury && <StatusBadge status={injury.status} />}
            </Link>;
          })}
        </CardContent>
      </Card>
    </section>
  );
}

function normalizePosition(value: string) {
  const pos = value.toUpperCase();
  return pos === "DEF" || pos === "D/ST" ? "DST" : pos;
}

export default async function TeamReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: sleeperRows }, { data: espnRows }, players, injuries, waiverPicks] = await Promise.all([
    supabase.from("sleeper_rosters").select("*").eq("profile_id", user!.id).order("synced_at", { ascending: false }),
    supabase.from("espn_rosters").select("*").eq("profile_id", user!.id).order("synced_at", { ascending: false }),
    getPlayers(),
    getInjuries(),
    getWaiverPicks(),
  ]);

  const teams: TeamRoster[] = [
    ...((sleeperRows ?? []) as SleeperRosterRow[]).map((roster) => ({
      id: `sleeper-${roster.id}`, platform: "Sleeper" as const, teamName: roster.team_name ?? "My team", leagueName: roster.league_name,
      wins: roster.wins, losses: roster.losses, ties: roster.ties,
      players: roster.roster_json.map((player) => ({ name: player.name, pos: player.pos, team: player.team })),
    })),
    ...((espnRows ?? []) as { id: string; team_name: string; league_name: string; wins: number; losses: number; ties: number; roster_json: RosterPlayer[] }[]).map((roster) => ({
      id: `espn-${roster.id}`, platform: "ESPN" as const, teamName: roster.team_name, leagueName: roster.league_name,
      wins: roster.wins, losses: roster.losses, ties: roster.ties, players: roster.roster_json,
    })),
  ];

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Your synced leagues</p>
      <h1 className="mt-1 text-2xl font-bold">Team Review</h1>
      <p className="mt-1 text-sm text-muted">Roster depth, injury exposure, and waiver fits for your ESPN and Sleeper teams.</p>
    </header>
    {teams.length ? teams.map((team) => <TeamReview key={team.id} team={team} players={players} injuries={injuries} waiverPicks={waiverPicks} />) : <Card><CardContent className="flex flex-col items-start gap-3 p-6"><Link2 className="h-5 w-5 text-primary" /><div><p className="font-semibold">Connect a team to review your roster</p><p className="mt-1 text-sm text-muted">Team Review uses your synced ESPN or Sleeper roster to find positional gaps and relevant waiver targets.</p></div><Button asChild><Link href="/dashboard/sync">Connect ESPN or Sleeper</Link></Button></CardContent></Card>}
  </div>;
}
