import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWaiverPicks } from "@/lib/data";
import type { SleeperRosterRow } from "@/lib/types";
import { PosBadge } from "@/components/pos-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link2 } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";

const positionAccent: Record<string, string> = {
  QB: "border-l-violet-400 bg-violet-500/[.045]",
  RB: "border-l-emerald-400 bg-emerald-500/[.045]",
  WR: "border-l-sky-400 bg-sky-500/[.045]",
  TE: "border-l-amber-400 bg-amber-500/[.045]",
  K: "border-l-orange-400 bg-orange-500/[.045]",
  DST: "border-l-rose-400 bg-rose-500/[.045]",
};

type RosterPlayer = { name: string; pos: string };
type TeamRoster = {
  id: string;
  platform: "Sleeper" | "ESPN";
  teamName: string;
  leagueName: string;
  players: RosterPlayer[];
};

const DEPTH_TARGETS: Record<string, number> = { QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DST: 1 };

function normalizePosition(value: string) {
  const position = value.toUpperCase();
  return position === "DEF" || position === "D/ST" ? "DST" : position;
}

function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function teamWaiverTargets(picks: Awaited<ReturnType<typeof getWaiverPicks>>, roster: TeamRoster) {
  const rosterNames = new Set(roster.players.map((player) => normalizeName(player.name)));
  const counts = Object.fromEntries(Object.keys(DEPTH_TARGETS).map((pos) => [pos, 0]));
  for (const player of roster.players) {
    const pos = normalizePosition(player.pos);
    if (pos in counts) counts[pos]++;
  }
  const depthRatios = Object.fromEntries(Object.entries(DEPTH_TARGETS).map(([pos, target]) => [pos, counts[pos] / target]));
  const maxDepth = Math.max(...Object.values(depthRatios));
  return picks
    .map((pick, index) => ({ pick, index, position: normalizePosition(pick.pos ?? "") }))
    .filter(({ pick }) => !rosterNames.has(normalizeName(pick.name)))
    .sort((a, b) => {
      const aNeed = DEPTH_TARGETS[a.position] ? maxDepth - depthRatios[a.position] : -1;
      const bNeed = DEPTH_TARGETS[b.position] ? maxDepth - depthRatios[b.position] : -1;
      return bNeed - aNeed || a.index - b.index;
    })
    .slice(0, 8)
    .map(({ pick }) => pick);
}

function WaiverPickList({ picks }: { picks: Awaited<ReturnType<typeof getWaiverPicks>> }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {picks.map((pick, index) => (
        <Card key={pick.id} className={`group overflow-hidden border-l-4 border-y-slate-700/80 border-r-slate-700/80 bg-gradient-to-br from-slate-800/60 to-slate-950/80 transition hover:-translate-y-0.5 hover:border-r-slate-500 hover:shadow-xl hover:shadow-black/20 ${positionAccent[(pick.pos ?? "").toUpperCase()] ?? "border-l-slate-400"}`}>
          <CardContent className="relative p-4 sm:p-5">
            <span className="absolute right-4 top-4 text-xs font-black tracking-widest text-slate-500">WAIVER #{String(index + 1).padStart(2, "0")}</span>
            <div className="flex items-center gap-3 pr-24">
              <PlayerAvatar name={pick.name} team={pick.team ?? "FA"} position={pick.pos ?? "?"} size={54} />
              <div className="min-w-0"><p className="truncate text-base font-extrabold text-slate-100 group-hover:text-white">{pick.name}</p><div className="mt-1.5 flex items-center gap-2"><PosBadge pos={pick.pos ?? "?"} /><span className="text-xs font-bold text-slate-400">{pick.team ?? "Free agent"}</span></div></div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-700/70 pt-3"><span className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300">~{pick.pct_rostered_est ?? "—"}% rostered</span>{pick.source && <span className="truncate text-[10px] uppercase tracking-wider text-slate-500">{pick.source}</span>}</div>
            {pick.note && <p className="mt-3 text-sm leading-6 text-slate-300">{pick.note}</p>}
          </CardContent>
        </Card>
      ))}
      {picks.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted">No unrostered waiver targets match this team right now.</p>}
    </div>
  );
}

export default async function WaiverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [picks, { data: sleeperRows }, { data: espnRows }] = await Promise.all([
    getWaiverPicks(),
    supabase.from("sleeper_rosters").select("*").eq("profile_id", user!.id).order("synced_at", { ascending: false }),
    supabase.from("espn_rosters").select("*").eq("profile_id", user!.id).order("synced_at", { ascending: false }),
  ]);

  const teams: TeamRoster[] = [
    ...((sleeperRows ?? []) as SleeperRosterRow[]).map((roster) => ({
      id: `sleeper-${roster.id}`,
      platform: "Sleeper" as const,
      teamName: roster.team_name ?? "My team",
      leagueName: roster.league_name,
      players: roster.roster_json.map((player) => ({ name: player.name, pos: player.pos })),
    })),
    ...((espnRows ?? []) as { id: string; team_name: string; league_name: string; roster_json: RosterPlayer[] }[]).map((roster) => ({
      id: `espn-${roster.id}`,
      platform: "ESPN" as const,
      teamName: roster.team_name,
      leagueName: roster.league_name,
      players: roster.roster_json,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-600/60 bg-[linear-gradient(135deg,#343a42,#161a20_75%)] p-6 sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-slate-300">Roster-aware pickups</p>
        <h1 className="mt-2 text-3xl font-black text-slate-50 sm:text-4xl">Waiver Wire</h1>
        <p className="mt-2 text-sm text-slate-300/75">Targets are sorted by positional depth for your synced teams. Each player card is highlighted by position.</p>
      </div>

      {teams.length ? teams.map((team) => {
        const teamPicks = teamWaiverTargets(picks, team);
        const thinPositions = Object.entries(DEPTH_TARGETS)
          .map(([pos, target]) => ({ pos, ratio: team.players.filter((player) => normalizePosition(player.pos) === pos).length / target }))
          .sort((a, b) => a.ratio - b.ratio)
          .slice(0, 2)
          .map(({ pos }) => pos);
        return <section key={team.id} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold uppercase tracking-wide">{team.teamName}</h2>
            <Badge variant="outline">{team.leagueName}</Badge>
            <Badge variant="secondary">{team.platform}</Badge>
            <span className="text-xs text-muted">Priority positions: {thinPositions.join(", ")}</span>
          </div>
          <WaiverPickList picks={teamPicks} />
        </section>;
      }) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <Link2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Connect your fantasy team for tailored waiver targets</p>
              <p className="mt-1 text-sm text-muted">We&apos;ll prioritize positions where your roster has less depth and hide players you already have.</p>
            </div>
            <Button asChild><Link href="/dashboard/sync">Connect ESPN or Sleeper</Link></Button>
          </CardContent>
        </Card>
      )}

      {!teams.length && <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-muted">General waiver targets</h2>
        {picks.length ? <WaiverPickList picks={picks} /> : <p className="py-8 text-center text-muted">No waiver picks on file right now.</p>}
      </section>}
    </div>
  );
}
