import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getInjuries, getPlayers, getWaiverPicks } from "@/lib/data";
import type { SleeperRosterRow, InjuryRow, PlayerRow, WaiverPickRow } from "@/lib/types";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Link2, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { hasActiveMembership } from "@/lib/membership";
import { MembershipWall } from "@/components/membership-wall";
import { RosterBrowser } from "./roster-browser";
import { getAllPlayers, getLeagueRosters, sleeperPlayerName, SleeperApiError, type SleeperPlayerDict } from "@/lib/sleeper";

type RosterPlayer = { name: string; pos: string; team: string | null };
type PositionComparison = { pos: string; rank: number; teams: number; points: number; leagueAverage: number };
type TeamRoster = { id: string; platform: "ESPN" | "Sleeper"; teamName: string; leagueName: string; wins: number; losses: number; ties: number; players: RosterPlayer[]; positionalComparison?: { positions: PositionComparison[]; error?: string } };
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
              {recommendedPicks.length ? recommendedPicks.map((pick) => <div key={pick.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"><div className="flex items-center gap-2"><PosBadge pos={pick.pos ?? "?"} /><span className="text-sm font-medium">{pick.name}</span></div><span className="text-xs text-muted">~{pick.pct_rostered_est}% rostered</span></div>) : <div className="rounded-xl border border-dashed border-border bg-background/30 p-3">
                <p className="text-sm font-medium text-foreground">{thinPositions.length ? `No ${thinPositions.join(" or ")} picks in the current waiver feed` : "Your roster meets the basic depth targets"}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{thinPositions.length ? "Browse the full waiver list for other available players; targets depend on the latest imported waiver data." : "You can still browse waiver targets for potential upgrades."}</p>
                <Link href="/dashboard/waiver" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Browse waiver targets <ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Positional strength vs. league</CardTitle><CardDescription>How your starter-level production compares with every team in this Sleeper league.</CardDescription></CardHeader>
        <CardContent>
          {team.positionalComparison?.positions.length ? <>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{team.positionalComparison.positions.map((row) => {
              const difference = row.points - row.leagueAverage;
              return <div key={row.pos} className="rounded-xl border border-border bg-background/35 p-3">
                <div className="flex items-center gap-2"><PosBadge pos={row.pos} /><span className="ml-auto text-sm font-black tabular-nums">{row.points.toFixed(1)} PPG</span></div>
                <div className="mt-2 flex items-center justify-between gap-2"><span className={`text-xs font-bold ${difference >= 0 ? "text-emerald-400" : "text-rose-400"}`}>#{row.rank} of {row.teams} · {difference >= 0 ? "+" : ""}{difference.toFixed(1)} vs avg</span><span className="text-[10px] text-muted">{row.leagueAverage.toFixed(1)} avg</span></div>
              </div>;
            })}</div>
            <p className="mt-3 text-[10px] leading-4 text-muted">Based on matched season player PPG, using your top two RB/WR and top player at other positions. This is a roster comparison, not a projection; unmatched players are excluded.</p>
          </> : <p className="rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted">{team.positionalComparison?.error ?? (team.platform === "Sleeper" ? "League rosters are not available for comparison right now." : "League-mate comparison is currently available for Sleeper leagues; ESPN league rosters are not provided by the current sync.")}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0"><div><CardTitle>Players on this team</CardTitle><CardDescription>{roster.length} synced roster players · filter, sort, or group by position and weekly trend</CardDescription></div><TrendingUp className="h-5 w-5 text-muted" /></CardHeader>
        <CardContent>
          <RosterBrowser players={roster.map(({ roster: player, player: rankedPlayer, injury }) => ({
            name: player.name,
            pos: normalizePosition(player.pos),
            team: player.team,
            playerId: rankedPlayer?.id ?? null,
            averagePoints: rankedPlayer?.avg_pts ?? null,
            positionRank: rankedPlayer?.pos_rank ?? null,
            trend: rankedPlayer?.wk1_pts != null && rankedPlayer.wk2_pts != null ? rankedPlayer.wk2_pts - rankedPlayer.wk1_pts : null,
            injury: injury ?? null,
          }))} />
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
  if (!user || !await hasActiveMembership(user.id, user.email)) return <MembershipWall feature="Team Review" />;
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

  const sleeperRosterRows = (sleeperRows ?? []) as SleeperRosterRow[];
  const comparisons = new Map<string, TeamRoster["positionalComparison"]>();
  if (sleeperRosterRows.length) {
    let sleeperPlayers: SleeperPlayerDict | null = null;
    try {
      sleeperPlayers = await getAllPlayers();
    } catch (error) {
      const message = error instanceof SleeperApiError ? error.message : "Sleeper player data could not be loaded.";
      sleeperRosterRows.forEach((row) => comparisons.set(row.id, { positions: [], error: message }));
    }

    if (sleeperPlayers) {
      await Promise.all(sleeperRosterRows.map(async (savedRoster) => {
        try {
          const leagueRosters = await getLeagueRosters(savedRoster.sleeper_league_id);
          const ownedIds = new Set(savedRoster.roster_json.map((player) => player.sleeper_player_id));
          const peerTeams = leagueRosters.map((leagueRoster) => {
            const ids = leagueRoster.players ?? [];
            return {
              isOwn: ids.some((id) => ownedIds.has(id)),
              players: ids.map((id) => {
                const info = sleeperPlayers![id];
                const player = players.find((candidate) => normalizeName(candidate.name) === normalizeName(sleeperPlayerName(id, info)));
                return { pos: normalizePosition(info?.position ?? player?.pos ?? "?"), avg: player?.avg_pts ?? null };
              }),
            };
          });
          const ownTeam = peerTeams.find((peer) => peer.isOwn);
          if (!ownTeam) {
            comparisons.set(savedRoster.id, { positions: [], error: "Your roster could not be matched to the current Sleeper league rosters. Sync the league again and retry." });
            return;
          }
          const positions = POSITIONS.map((pos) => {
            const starterCount = pos === "RB" || pos === "WR" ? 2 : 1;
            const pointsFor = (roster: typeof peerTeams[number]) => roster.players
              .filter((player) => player.pos === pos && player.avg != null)
              .map((player) => player.avg!)
              .sort((a, b) => b - a)
              .slice(0, starterCount)
              .reduce((sum, points) => sum + points, 0);
            const points = pointsFor(ownTeam);
            const leagueValues = peerTeams.map(pointsFor);
            return {
              pos,
              points,
              rank: leagueValues.filter((value) => value > points).length + 1,
              teams: peerTeams.length,
              leagueAverage: leagueValues.reduce((sum, value) => sum + value, 0) / Math.max(leagueValues.length, 1),
            };
          });
          comparisons.set(savedRoster.id, { positions });
        } catch (error) {
          const message = error instanceof SleeperApiError ? error.message : "Sleeper league rosters could not be loaded.";
          comparisons.set(savedRoster.id, { positions: [], error: message });
        }
      }));
    }
  }
  teams.forEach((team) => {
    if (team.platform === "Sleeper") {
      const roster = sleeperRosterRows.find((row) => `sleeper-${row.id}` === team.id);
      if (roster) team.positionalComparison = comparisons.get(roster.id);
    }
  });

  return <div className="space-y-6">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Your synced leagues</p>
      <h1 className="mt-1 text-2xl font-bold">Team Review</h1>
      <p className="mt-1 text-sm text-muted">Roster depth, injury exposure, and waiver fits for your ESPN and Sleeper teams.</p>
    </header>
    {teams.length ? teams.map((team) => <TeamReview key={team.id} team={team} players={players} injuries={injuries} waiverPicks={waiverPicks} />) : <Card className="overflow-hidden border-dashed border-slate-600"><CardContent className="flex flex-col items-start gap-4 bg-[linear-gradient(135deg,rgba(100,116,139,.12),transparent)] p-6 sm:p-8"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-500/30 bg-slate-500/10"><Link2 className="h-5 w-5 text-slate-300" /></span><div><p className="text-lg font-bold">No synced teams to review yet</p><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">Once you connect ESPN or Sleeper, this page fills in with positional depth, roster health, waiver fits, and player profiles for each team.</p></div><Button asChild><Link href="/dashboard/sync">Connect your team</Link></Button></CardContent></Card>}
  </div>;
}
