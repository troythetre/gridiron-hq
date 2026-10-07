"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Activity, AlertTriangle, BarChart3, ChevronDown, HeartPulse, Newspaper, ShieldCheck, Sparkles, Target, TrendingUp, Users, Zap } from "lucide-react";
import { useFantasyPreferences, pointsForFormat } from "@/components/fantasy-preferences";
import { PlayerAvatar } from "@/components/player-avatar";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InjuryRow, WaiverPickRow } from "@/lib/types";
import { forecastFantasyScore, type FantasyScoreModel } from "@/lib/fantasy-ml";

type WeekStat = { week: number; points: number | null; receptions: number; targets: number; carries: number; yards: number; touchdowns: number };
type MatchupSplit = { targets: number; receptions: number; yards: number; touchdowns: number; catchRate: number; yardsPerTarget: number; averageAirYards: number; [key: string]: string | number };
type PlayerMatchup = { coverage: MatchupSplit[]; blitz: MatchupSplit[]; personnel: MatchupSplit[] };
export type AnalysisPlayer = {
  key: string; name: string; pos: string; team: string; playerId: number | null;
  avgPts: number; posRank: number | null; overallRank: number | null; injury: InjuryRow | null;
  weeks: WeekStat[]; yearsExperience: number | null; rookieSeason: number | null;
  matchup: PlayerMatchup | null;
  news: { headline: string; date: string | null }[];
};
export type AnalysisTeam = {
  id: string; teamName: string; leagueName: string; platform: "Sleeper" | "ESPN";
  wins: number; losses: number; ties: number; syncedAt: string; players: AnalysisPlayer[];
  leagueComparison?: { teams: { name: string; isOwn: boolean; players: { pos: string; avgPts: number | null }[] }[]; error?: string };
};

const positions = ["QB", "RB", "WR", "TE", "K", "DST"];
const depthTarget: Record<string, number> = { QB: 2, RB: 4, WR: 4, TE: 2, K: 1, DST: 1 };

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function normalizePos(value: string) { const pos = value.toUpperCase(); return pos === "DEF" || pos === "D/ST" ? "DST" : pos; }
function fmt(value: number) { return Number.isFinite(value) ? value.toFixed(1) : "0.0"; }
function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }

function weeklyPoints(player: AnalysisPlayer, scoring: "standard" | "half_ppr" | "ppr") {
  const games = player.weeks.filter((week) => week.points != null);
  if (!games.length) return [];
  return games.map((week) => ({ ...week, score: pointsForFormat(week.points ?? 0, week.receptions, scoring) }));
}

function selectLineup<T extends { player: AnalysisPlayer; points: number }>(players: T[]) {
  const picked: T[] = [];
  const take = (pos: string, count: number) => {
    players.filter((item) => normalizePos(item.player.pos) === pos && !picked.includes(item))
      .sort((a, b) => b.points - a.points).slice(0, count).forEach((item) => picked.push(item));
  };
  take("QB", 1); take("RB", 2); take("WR", 2); take("TE", 1);
  players.filter((item) => ["RB", "WR", "TE"].includes(normalizePos(item.player.pos)) && !picked.includes(item))
    .sort((a, b) => b.points - a.points).slice(0, 2).forEach((item) => picked.push(item));
  take("K", 1); take("DST", 1);
  return picked;
}

export function MyTeamAnalysis({ teams, waiver, matchupSeasons, fantasyScoreModel }: { teams: AnalysisTeam[]; waiver: WaiverPickRow[]; matchupSeasons: [number, number]; fantasyScoreModel: FantasyScoreModel }) {
  const { scoring, mode } = useFantasyPreferences();
  const [activeTeamId, setActiveTeamId] = useState(teams[0]?.id ?? "");
  const team = teams.find((candidate) => candidate.id === activeTeamId) ?? teams[0];
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("points");
  const [groupBy, setGroupBy] = useState<"none" | "position" | "trend">("none");

  const enriched = useMemo(() => team.players.map((player) => {
    const games = weeklyPoints(player, scoring);
    const points = games.length ? games.map((week) => week.score) : [pointsForFormat(player.avgPts, 0, scoring)];
    const recent = games.slice(-3).map((week) => week.score);
    const previous = games.slice(-6, -3).map((week) => week.score);
    const avg = average(points);
    const recentAvg = recent.length ? average(recent) : avg;
    const delta = recentAvg - (previous.length ? average(previous) : avg);
    const std = Math.sqrt(average(points.map((value) => (value - avg) ** 2)));
    const opportunity = games.length ? average(games.map((week) => week.targets + week.carries)) : 0;
    const modelForecast = forecastFantasyScore(
      player.weeks.map((week) => ({ week: week.week, fantasyPoints: week.points })),
      player.pos,
      fantasyScoreModel,
    );
    const recentReceptions = average(games.slice(-3).map((week) => week.receptions));
    const forecast = modelForecast
      ? { points: pointsForFormat(modelForecast.points, recentReceptions, scoring) }
      : null;
    return { player, games, points, avg, recentAvg, delta, std, opportunity, forecast, high: Math.max(...points), low: Math.min(...points) };
  }), [team, scoring, fantasyScoreModel]);

  const positionSummary = positions.map((pos) => {
    const rows = enriched.filter(({ player }) => normalizePos(player.pos) === pos);
    const best = [...rows].sort((a, b) => b.avg - a.avg).slice(0, pos === "RB" || pos === "WR" ? 2 : 1);
    return { pos, count: rows.length, target: depthTarget[pos], average: average(rows.map((row) => row.avg)), projected: best.reduce((sum, row) => sum + row.avg, 0), rows };
  });
  const positionalComparison = positions.map((pos) => {
    const starterCount = pos === "RB" || pos === "WR" ? 2 : 1;
    const strengthFor = (players: { pos: string; avgPts: number | null }[]) => players
      .filter((player) => normalizePos(player.pos) === pos && player.avgPts != null)
      .map((player) => player.avgPts!)
      .sort((a, b) => b - a)
      .slice(0, starterCount)
      .reduce((sum, points) => sum + points, 0);
    const leagueTeams = team.leagueComparison?.teams ?? [];
    const values = leagueTeams.map((entry) => ({ name: entry.name, strength: strengthFor(entry.players) }));
    const mine = leagueTeams.find((entry) => entry.isOwn);
    const ownStrength = mine
      ? strengthFor(mine.players)
      : strengthFor(team.players.map((player) => ({ pos: player.pos, avgPts: player.avgPts })));
    const strongerTeams = values.filter((entry) => entry.strength > ownStrength).length;
    return {
      pos,
      strength: ownStrength,
      rank: strongerTeams + 1,
      leagueAverage: values.length ? average(values.map((entry) => entry.strength)) : null,
      leagueSize: values.length,
    };
  });
  const lineup = selectLineup(enriched.map(({ player, avg }) => ({ player, points: avg })));
  const projectedPoints = lineup.reduce((sum, item) => sum + item.points, 0);
  const modelLineup = selectLineup(enriched.map(({ player, avg, forecast }) => ({
    player,
    points: forecast?.points ?? avg,
    isModelled: forecast != null,
    forecast,
  })));
  const modelLineupPoints = modelLineup.reduce((sum, item) => sum + item.points, 0);
  const modelledStarters = modelLineup.filter((item) => item.isModelled).length;
  const injuryRows = enriched.filter(({ player }) => player.injury);
  const atRiskPoints = injuryRows.reduce((sum, row) => sum + row.avg, 0);
  const allWeeks = [...new Set(enriched.flatMap(({ games }) => games.map((week) => week.week)))].sort((a, b) => a - b);
  const weeklyLineup = allWeeks.map((week) => {
    const candidates = enriched.flatMap(({ player, games }) => {
      const game = games.find((item) => item.week === week);
      return game ? [{ player, points: game.score }] : [];
    });
    return { week, points: selectLineup(candidates).reduce((sum, item) => sum + item.points, 0) };
  });
  const recentTeamAverage = average(weeklyLineup.slice(-3).map((week) => week.points));
  const previousTeamAverage = average(weeklyLineup.slice(-6, -3).map((week) => week.points));
  const teamTrend = recentTeamAverage - (previousTeamAverage || recentTeamAverage);
  const trends = enriched.filter(({ games }) => games.length >= 2).sort((a, b) => b.delta - a.delta);
  const topMovers = [...trends.slice(0, 3), ...trends.slice(-3).reverse()].filter((item, index, rows) => rows.findIndex((other) => other.player.key === item.player.key) === index);
  const rosterNames = new Set(team.players.map((player) => normalize(player.name)));
  const thinPositions = positionSummary.filter((row) => row.count < row.target).sort((a, b) => a.count / a.target - b.count / b.target);
  const waiverFits = waiver.filter((pick) => pick.pos && thinPositions.some((row) => row.pos === normalizePos(pick.pos!)) && !rosterNames.has(normalize(pick.name))).slice(0, 5);
  const sortedPlayers = [...enriched].sort((a, b) => {
    if (sortBy === "trend") return b.delta - a.delta;
    if (sortBy === "rank") return (a.player.posRank ?? 999) - (b.player.posRank ?? 999);
    if (sortBy === "opportunity") return b.opportunity - a.opportunity;
    if (mode === "dynasty" && (a.player.yearsExperience ?? 99) !== (b.player.yearsExperience ?? 99)) return (a.player.yearsExperience ?? 99) - (b.player.yearsExperience ?? 99);
    return b.avg - a.avg;
  }).filter(({ player }) => positionFilter === "ALL" || normalizePos(player.pos) === positionFilter);
  const trendGroup = (delta: number, games: number) => games < 2 ? "Limited data" : delta >= 0.5 ? "Rising" : delta <= -0.5 ? "Falling" : "Steady";
  const playerGroups = groupBy === "position"
    ? positions.map((pos) => ({ label: pos, rows: sortedPlayers.filter(({ player }) => normalizePos(player.pos) === pos) })).filter((group) => group.rows.length)
    : groupBy === "trend"
      ? ["Rising", "Steady", "Falling", "Limited data"].map((label) => ({
        label,
        rows: sortedPlayers.filter((row) => trendGroup(row.delta, row.games.length) === label),
      })).filter((group) => group.rows.length)
      : [{ label: "", rows: sortedPlayers }];
  const maxWeekly = Math.max(1, ...weeklyLineup.map((week) => week.points));
  const scoringName = scoring === "ppr" ? "PPR" : scoring === "standard" ? "Standard" : "Half-PPR";

  return <div className="space-y-5">
    {teams.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">{teams.map((item) => <button key={item.id} onClick={() => { setActiveTeamId(item.id); setPositionFilter("ALL"); }} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${item.id === team.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted hover:text-foreground"}`}>{item.teamName} · {item.platform}</button>)}</div>}
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-black uppercase">{team.teamName}</h2><Badge variant="outline">{team.leagueName}</Badge><Badge variant="secondary">{team.platform}</Badge></div><p className="mt-1 text-xs text-muted">{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ""} · {team.players.length} players · {scoringName} · {mode}</p></div><p className="text-[10px] text-muted">Synced {new Date(team.syncedAt).toLocaleDateString()}</p></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="Lineup projection" value={`${fmt(projectedPoints)} PPG`} detail="Best available 1QB lineup" icon={<Zap />} />
        <Metric label="Rostered players" value={String(team.players.length)} detail={`${positions.filter((pos) => enriched.some(({ player }) => normalizePos(player.pos) === pos)).length} positions represented`} icon={<Users />} />
        <Metric label="Roster health" value={`${injuryRows.length} flagged`} detail={`${fmt(atRiskPoints)} PPG across flagged players`} icon={<HeartPulse />} tone={injuryRows.length ? "warning" : "good"} />
        <Metric label="Recent lineup" value={`${fmt(recentTeamAverage)} PPG`} detail={teamTrend > 0.05 ? `+${fmt(teamTrend)} vs prior 3 weeks` : `${fmt(teamTrend)} vs prior 3 weeks`} icon={<Activity />} tone={teamTrend >= 0 ? "good" : "warning"} />
        <Metric label="Top roster rank" value={enriched.filter((row) => row.player.posRank != null).length ? `#${Math.min(...enriched.map((row) => row.player.posRank ?? 999))}` : "—"} detail="Best positional rank" icon={<Target />} />
        <Metric label="Roster gaps" value={String(thinPositions.length)} detail={thinPositions.length ? thinPositions.map((row) => row.pos).join(" · ") : "Depth targets met"} icon={<AlertTriangle />} tone={thinPositions.length ? "warning" : "good"} />
      </div>
    </section>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Machine-learning lineup forecast</CardTitle>
        <CardDescription>Position-specific ridge regression trained on historical player-week scoring. It uses recent points, three-game average, season average, and scoring trend; it does not factor in opponents or future injury news.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <MiniStat label="Next lineup estimate" value={`${fmt(modelLineupPoints)} ${scoringName} points`} />
          <MiniStat label="Starters modelled" value={`${modelledStarters}/${modelLineup.length} · ${modelLineup.length - modelledStarters} use average fallback`} />
          <MiniStat label={`Holdout MAE · ${fantasyScoreModel.validation.seasons.join(", ") || "unavailable"}`} value={fantasyScoreModel.validation.modelMae == null ? "Not enough validation data" : `${fmt(fantasyScoreModel.validation.modelMae)} half-PPR points · ${fantasyScoreModel.validation.samples} player-weeks`} />
        </div>
        {fantasyScoreModel.validation.modelMae != null && fantasyScoreModel.validation.baselineMae != null && <p className="text-[10px] leading-4 text-muted">Holdout comparison: {fmt(fantasyScoreModel.validation.modelMae)} points MAE for the model versus {fmt(fantasyScoreModel.validation.baselineMae)} for a trailing three-game-average baseline. Holdout scores are half-PPR regardless of the display scoring setting.</p>}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {modelLineup.map(({ player, points, isModelled }) => <div key={player.key} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/30 p-2.5">
            <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={40} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{player.name}</span><span className="mt-1 flex items-center gap-1.5"><PosBadge pos={player.pos} /><span className="text-[10px] text-muted">{isModelled ? "ML estimate" : "Average fallback"}</span></span></span>
            <span className="text-right"><strong className="block text-sm tabular-nums">{fmt(points)}</strong><span className="text-[9px] uppercase text-muted">points</span></span>
          </div>)}
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Weekly lineup trend</CardTitle><CardDescription>Best lineup from rostered players by week · {scoringName}. Bye weeks and missed games lower that week&apos;s available score.</CardDescription></CardHeader><CardContent>
        {weeklyLineup.length ? <div className="flex h-44 items-end gap-2 border-b border-border pb-2">{weeklyLineup.map((week) => <div key={week.week} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] font-bold tabular-nums text-muted">{fmt(week.points)}</span><div title={`Week ${week.week}: ${fmt(week.points)} points`} className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-400" style={{ height: `${Math.max(5, week.points / maxWeekly * 78)}%` }} /><span className="text-[9px] text-muted">W{week.week}</span></div>)}</div> : <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">Weekly game logs have not been published for these players yet. Roster ranks, usage and available stats still appear below.</div>}
        <div className="mt-4 grid gap-2 sm:grid-cols-3"><MiniStat label="Best logged week" value={weeklyLineup.length ? `W${weeklyLineup.reduce((best, row) => row.points > best.points ? row : best).week} · ${fmt(Math.max(...weeklyLineup.map((row) => row.points)))} pts` : "No game logs yet"} /><MiniStat label="Last 3 weeks" value={weeklyLineup.length ? `${fmt(recentTeamAverage)} PPG` : "—"} /><MiniStat label="Season logged avg" value={weeklyLineup.length ? `${fmt(average(weeklyLineup.map((row) => row.points)))} PPG` : "—"} /></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Position strength and depth</CardTitle><CardDescription>Roster count, production, and basic depth targets by position.</CardDescription></CardHeader><CardContent className="space-y-3">{positionSummary.map((row) => { const strength = Math.min(100, Math.round(row.count / row.target * 100)); return <div key={row.pos} className="rounded-xl border border-border bg-background/35 p-3"><div className="flex items-center gap-2"><PosBadge pos={row.pos} /><span className="flex-1 text-xs text-muted">{row.count}/{row.target} roster target</span><strong className="text-xs tabular-nums">{fmt(row.average)} avg PPG</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full ${strength >= 100 ? "bg-emerald-400" : strength >= 60 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${strength}%` }} /></div><p className="mt-1.5 text-[10px] text-muted">{row.projected ? `${fmt(row.projected)} PPG from top ${row.pos === "RB" || row.pos === "WR" ? "two" : "player"}${row.count < row.target ? " · depth opportunity" : " · rostered depth"}` : "No matched player stats"}</p></div>; })}</CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />How your positions stack up</CardTitle><CardDescription>Starter-level season PPG compared with every roster in this Sleeper league. RB/WR use the top two players; other positions use the top player.</CardDescription></CardHeader><CardContent>
      {team.leagueComparison?.teams.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{positionalComparison.map((row) => {
        const difference = row.leagueAverage == null ? null : row.strength - row.leagueAverage;
        const description = row.leagueSize ? `#${row.rank} of ${row.leagueSize} · ${difference == null ? "league avg unavailable" : `${difference >= 0 ? "+" : ""}${fmt(difference)} vs league avg`}` : "League comparison unavailable";
        return <div key={row.pos} className="rounded-xl border border-border bg-background/35 p-3">
          <div className="flex items-center gap-2"><PosBadge pos={row.pos} /><span className="ml-auto text-sm font-black tabular-nums">{fmt(row.strength)} PPG</span></div>
          <div className="mt-2 flex items-center justify-between gap-2"><span className={`text-xs font-bold ${difference == null ? "text-muted" : difference >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{description}</span><span className="text-[10px] text-muted">{row.leagueAverage == null ? "—" : `${fmt(row.leagueAverage)} avg`}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full ${difference == null ? "bg-muted" : difference >= 0 ? "bg-emerald-400" : "bg-rose-400"}`} style={{ width: `${row.leagueAverage == null ? 0 : Math.min(100, Math.max(8, row.strength / Math.max(1, row.leagueAverage * 1.6) * 100))}%` }} /></div>
        </div>;
      })}</div> : <p className="rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted">{team.leagueComparison?.error ?? (team.platform === "Sleeper" ? "League roster comparison is not available right now." : "League-mate comparison is currently available for Sleeper leagues; ESPN league rosters are not provided by the current sync.")}</p>}
      {team.leagueComparison?.teams.length ? <p className="mt-3 text-[10px] leading-4 text-muted">Based on matched season player averages and the rosters returned by Sleeper. This compares positional starters, not lineup settings or future projections; players without matched stats are excluded.</p> : null}
    </CardContent></Card>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Recent player trends</CardTitle><CardDescription>Last three logged games versus the previous three; requires at least two games.</CardDescription></CardHeader><CardContent className="space-y-2">{topMovers.length ? topMovers.map(({ player, recentAvg, delta, games }) => <Link key={player.key} href={player.playerId ? `/dashboard/players/${player.playerId}` : "/dashboard/search"} className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3 transition hover:border-primary/30"><PlayerAvatar name={player.name} team={player.team} position={player.pos} size={42} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{player.name}</span><span className="text-[10px] text-muted">{games.length} games · {fmt(recentAvg)} recent PPG</span></span><span className={`flex items-center text-sm font-black ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{delta >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{delta >= 0 ? "+" : ""}{fmt(delta)}</span></Link>) : <p className="text-sm text-muted">Trend analysis appears after at least two weeks of player game logs.</p>}</CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Waiver fits for this roster</CardTitle><CardDescription>Available targets matched to the thinnest positions; players already rostered are excluded.</CardDescription></CardHeader><CardContent className="space-y-2">{waiverFits.length ? waiverFits.map((pick) => <div key={pick.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3"><PosBadge pos={pick.pos ?? "?"} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{pick.name}</p><p className="text-[10px] text-muted">{pick.team ?? "FA"} · ~{pick.pct_rostered_est ?? "—"}% rostered</p></div><span className="max-w-48 text-right text-xs text-muted">{pick.note}</span></div>) : <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">{thinPositions.length ? `No waiver picks currently match your ${thinPositions.map((row) => row.pos).join("/")} depth needs.` : "Your roster meets the basic depth targets across all positions."}<Link className="ml-1 font-bold text-primary hover:underline" href="/dashboard/waiver">Open waiver wire</Link></div>}</CardContent></Card>
    </div>

    {injuryRows.length > 0 && <Card className="border-rose-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-400" />Injury exposure</CardTitle><CardDescription>{injuryRows.length} rostered players match the current report · {fmt(atRiskPoints)} combined PPG affected.</CardDescription></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{injuryRows.map(({ player }) => <div key={player.key} className="flex items-center gap-3 rounded-xl border border-rose-500/15 bg-rose-500/[.04] p-3"><PlayerAvatar name={player.name} team={player.team} position={player.pos} size={40} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{player.name}</p><p className="text-xs text-muted">{player.injury?.injury} · {fmt(enriched.find((item) => item.player.key === player.key)?.avg ?? 0)} PPG</p></div><StatusBadge status={player.injury!.status} /></div>)}</CardContent></Card>}

    <Card><CardHeader><div className="flex flex-wrap items-end justify-between gap-3"><div><CardTitle>Full roster breakdown</CardTitle><CardDescription>Production, usage, consistency, rank, and player news for every rostered player.</CardDescription></div><div className="flex flex-wrap gap-2"><select aria-label="Filter by position" value={positionFilter} onChange={(event) => setPositionFilter(event.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-xs"><option value="ALL">All positions</option>{positions.map((pos) => <option key={pos}>{pos}</option>)}</select><select aria-label="Sort roster" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-xs"><option value="points">Sort: points</option><option value="trend">Sort: recent trend</option><option value="opportunity">Sort: usage</option><option value="rank">Sort: position rank</option></select><select aria-label="Group roster" value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)} className="h-9 rounded-lg border border-border bg-background px-3 text-xs"><option value="none">Group: none</option><option value="position">Group: position</option><option value="trend">Group: trend</option></select></div></div></CardHeader><CardContent className="space-y-3">{playerGroups.map((group) => <section key={group.label || "all"} className="space-y-2">{group.label && <h3 className="flex items-center justify-between px-1 text-xs font-black uppercase tracking-wider text-muted"><span>{group.label}</span><span>{group.rows.length}</span></h3>}<div className="space-y-2">{group.rows.map(({ player, games, avg, recentAvg, delta, std, opportunity, high, low }) => <details key={player.key} className="group rounded-2xl border border-border bg-background/25 open:bg-background/45"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-3 sm:p-4"><PlayerAvatar name={player.name} team={player.team} position={player.pos} size={46} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{player.name}</span><span className="mt-1 flex flex-wrap items-center gap-1.5"><PosBadge pos={player.pos} /><span className="text-[10px] text-muted">{player.team} · {player.posRank ? `Pos #${player.posRank}` : "Rank pending"}</span>{mode === "dynasty" && <span className="text-[10px] text-muted">{player.yearsExperience ?? "Rookie"} yrs exp</span>}</span></span><span className="text-right"><strong className="block text-base tabular-nums">{fmt(avg)}</strong><span className="text-[9px] uppercase text-muted">PPG</span></span><span className={`hidden min-w-20 text-right text-xs font-bold sm:block ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{delta >= 0 ? "+" : ""}{fmt(delta)} recent</span><span className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted transition group-open:rotate-180"><ChevronDown className="h-4 w-4" /></span></summary>
      <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-4"><MiniStat label="Season high / low" value={`${fmt(high)} / ${fmt(low)} pts`} /><MiniStat label="Consistency" value={`${fmt(std)} pt std dev`} /><MiniStat label="Opportunity" value={games.length ? `${fmt(opportunity)} targets + carries/game` : "Usage data pending"} /><MiniStat label="Recent form" value={games.length ? `${fmt(recentAvg)} PPG · ${delta >= 0 ? "+" : ""}${fmt(delta)} vs prior` : "Weekly logs pending"} />
        {games.length > 0 && <div className="sm:col-span-2 xl:col-span-4"><p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">Weekly scores · {scoringName}</p><div className="flex h-20 items-end gap-1.5">{games.slice(-8).map((game) => <div key={game.week} className="flex min-w-0 flex-1 flex-col items-center gap-1"><div title={`Week ${game.week}: ${fmt(game.score)} pts`} className="w-full max-w-10 rounded-t bg-gradient-to-t from-sky-700 to-sky-400" style={{ height: `${Math.max(6, game.score / Math.max(1, high) * 72)}%` }} /><span className="text-[9px] text-muted">W{game.week}</span></div>)}</div></div>}
        {player.injury && <div className="sm:col-span-2 xl:col-span-4 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[.05] p-2 text-xs"><StatusBadge status={player.injury.status} /><span>{player.injury.injury} · {player.injury.note}</span></div>}
        {player.news.length > 0 && <div className="sm:col-span-2 xl:col-span-4"><p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted"><Newspaper className="h-3.5 w-3.5" />Recent player news</p>{player.news.map((item, index) => <p key={`${item.headline}-${index}`} className="text-xs leading-5 text-foreground/80">{item.date ? `${item.date} · ` : ""}{item.headline}</p>)}</div>}
        {player.matchup && <div className="sm:col-span-2 xl:col-span-4"><div className="mb-2 flex flex-wrap items-end justify-between gap-2"><div><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary"><Target className="h-3.5 w-3.5" />Advanced matchup splits</p><p className="mt-1 text-[10px] text-muted">Historical receiving results · {matchupSeasons[0]}–{matchupSeasons[1]} · ≥5 coverage/blitz targets and ≥10 personnel targets</p></div><span className="text-[9px] text-muted">FTN Data via nflverse</span></div><div className="grid gap-2 lg:grid-cols-3"><MatchupPanel title="Coverage" rows={player.matchup.coverage} label={(row) => `${row.defense_man_zone_type?.toString().replaceAll("_", " ")} · ${row.defense_coverage_type?.toString().replaceAll("_", " ")}`} /><MatchupPanel title="Blitz" rows={player.matchup.blitz} label={(row) => `${row.blitz_bucket?.toString().replaceAll("_", " ")}`} /><MatchupPanel title="Personnel" rows={player.matchup.personnel} label={(row) => `${row.offense_personnel?.toString() ?? "Offense"} vs ${row.defense_personnel?.toString() ?? "Defense"}`} /></div><p className="mt-2 text-[9px] leading-4 text-muted">These are descriptive historical splits, not a complete matchup projection. Keep target counts beside rates; small samples can be noisy.</p></div>}
      </div></details>)}</div></section>)}</CardContent></Card>
    <div className="flex flex-wrap justify-between gap-3 text-[10px] text-muted"><span>Lineup estimates use a standard 1 QB / 2 RB / 2 WR / 1 TE / 2 FLEX / K / DST roster shape; adapt settings in your connected league for exact projections.</span><Link href="/dashboard/trades" className="font-bold text-primary hover:underline">Analyze a trade for this roster →</Link></div>
  </div>;
}

function Metric({ label, value, detail, icon, tone = "default" }: { label: string; value: string; detail: string; icon: React.ReactNode; tone?: "default" | "warning" | "good" }) {
  return <div className="rounded-xl border border-border bg-background/35 p-3"><div className={`flex items-center justify-between ${tone === "warning" ? "text-amber-400" : tone === "good" ? "text-emerald-400" : "text-primary"}`}><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span><span className="text-[9px] font-black uppercase tracking-wider text-muted">{label}</span></div><p className="mt-2 text-xl font-black tabular-nums">{value}</p><p className="mt-1 truncate text-[10px] text-muted">{detail}</p></div>;
}
function MatchupPanel({ title, rows, label }: { title: string; rows: MatchupSplit[]; label: (row: MatchupSplit) => string }) {
  return <section className="rounded-lg border border-border bg-background/35 p-3"><h4 className="mb-2 text-[9px] font-black uppercase tracking-wider text-muted">{title}</h4>{rows.length ? <div className="space-y-2">{rows.slice(0, 6).map((row, index) => <div key={`${label(row)}-${index}`} className="border-b border-border/70 pb-2 last:border-0 last:pb-0"><p className="line-clamp-2 text-[10px] font-semibold leading-4">{label(row)}</p><div className="mt-1 flex flex-wrap gap-x-2 text-[9px] text-muted"><span>{row.targets} tgt</span><span>{(row.catchRate * 100).toFixed(0)}% catch</span><span>{row.yardsPerTarget.toFixed(1)} YPT</span><span>{row.touchdowns} TD</span></div></div>)}</div> : <p className="text-[10px] leading-4 text-muted">No matchup split reached the target sample threshold.</p>}</section>;
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-background/35 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-muted">{label}</p><p className="mt-1 text-xs font-bold">{value}</p></div>;
}
