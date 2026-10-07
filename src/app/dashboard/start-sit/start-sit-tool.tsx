"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PlayerRow, InjuryRow } from "@/lib/types";
import { compare, scorePlayer, type InjuryStatus } from "@/lib/scoring";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, Search, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { pointsForFormat, useFantasyPreferences } from "@/components/fantasy-preferences";
import { PLAYER_PHOTOS } from "@/lib/player-visuals";

type ReceptionStats = {
  wk1: number;
  wk2: number;
  avg: number;
  weekly: { week: number; points: number; receptions: number; carries: number | null; targets: number | null; snapShare?: number | null }[];
};

function parseManualFloor(floors: Record<string, string>, name: string) {
  const value = floors[name]?.trim();
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function toScoreInput(
  p: PlayerRow,
  injury: InjuryRow | undefined,
  receptions: ReceptionStats | undefined,
  scoring: "standard" | "half_ppr" | "ppr",
  manualFloor: number | undefined,
) {
  const stats = receptions ?? { wk1: 0, wk2: 0, avg: 0, weekly: [] };
  return {
    name: p.name,
    pos: p.pos,
    team: p.team,
    wk1_pts: p.wk1_pts == null ? null : pointsForFormat(p.wk1_pts, stats.wk1, scoring),
    wk2_pts: p.wk2_pts == null ? null : pointsForFormat(p.wk2_pts, stats.wk2, scoring),
    avg_pts: pointsForFormat(p.avg_pts, stats.avg, scoring),
    weeklyScores: stats.weekly.map((week) => ({
      week: week.week,
      points: pointsForFormat(week.points, week.receptions, scoring),
      carries: week.carries,
      targets: week.targets,
      snapShare: week.snapShare,
    })),
    manualFloor,
    injuryStatus: (injury?.status as InjuryStatus) ?? null,
    injuryNote: injury?.note ?? undefined,
  };
}

export function StartSitTool({
  players,
  injuriesByName,
  rosterPlayerNames,
  receptionsByPlayer,
}: {
  players: PlayerRow[];
  injuriesByName: Record<string, InjuryRow>;
  rosterPlayerNames: string[];
  receptionsByPlayer: Record<string, ReceptionStats>;
}) {
  const sorted = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  const rosterNameSet = useMemo(() => new Set(rosterPlayerNames.map(normalizeName)), [rosterPlayerNames]);
  const rosterPlayers = useMemo(() => sorted.filter((player) => rosterNameSet.has(normalizeName(player.name))), [rosterNameSet, sorted]);
  const pickerPlayers = useMemo(() => [...rosterPlayers, ...sorted.filter((player) => !rosterNameSet.has(normalizeName(player.name)))], [rosterNameSet, rosterPlayers, sorted]);
  const [aName, setAName] = useState<string>(rosterPlayers[0]?.name ?? sorted[0]?.name ?? "");
  const [bName, setBName] = useState<string>(rosterPlayers[1]?.name ?? sorted.find((player) => player.name !== (rosterPlayers[0]?.name ?? sorted[0]?.name))?.name ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [upsidePreference, setUpsidePreference] = useState(35);
  const [manualFloors, setManualFloors] = useState<Record<string, string>>({});
  const { scoring } = useFantasyPreferences();

  const searchResults = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return pickerPlayers.slice(0, 50);
    return pickerPlayers
      .filter((player) => `${player.name} ${player.team} ${player.pos}`.toLowerCase().includes(needle))
      .slice(0, 50);
  }, [pickerPlayers, searchQuery]);

  const playerA = sorted.find((p) => p.name === aName);
  const playerB = sorted.find((p) => p.name === bName);

  // Compare the two players using the scoring logic.
  const result = useMemo(() => {
    if (!playerA || !playerB) return null;
    return compare(
      toScoreInput(playerA, injuriesByName[playerA.name], receptionsByPlayer[playerA.name], scoring, parseManualFloor(manualFloors, playerA.name)),
      toScoreInput(playerB, injuriesByName[playerB.name], receptionsByPlayer[playerB.name], scoring, parseManualFloor(manualFloors, playerB.name)),
      upsidePreference / 100,
    );
  }, [playerA, playerB, injuriesByName, receptionsByPlayer, scoring, upsidePreference, manualFloors]);
  const scoreA = result && playerA ? (result.winner.name === playerA.name ? result.winner.score : result.loser.score) : 0;
  const scoreB = result && playerB ? (result.winner.name === playerB.name ? result.winner.score : result.loser.score) : 0;
  const signedMargin = scoreA - scoreB;
  const leanA = Math.round(50 + (50 * signedMargin) / (Math.abs(signedMargin) + 8));
  const scoredA = result && playerA ? (result.winner.name === playerA.name ? result.winner : result.loser) : null;
  const scoredB = result && playerB ? (result.winner.name === playerB.name ? result.winner : result.loser) : null;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="compare">
        <TabsList aria-label="Start/Sit tools">
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="compare" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PlayerPicker label="Player A" value={aName} onChange={setAName} players={pickerPlayers} rosterPlayerNames={rosterNameSet} />
            <PlayerPicker label="Player B" value={bName} onChange={setBName} players={pickerPlayers} rosterPlayerNames={rosterNameSet} />
          </div>
          <Card>
            <CardContent className="grid gap-5 p-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="upside-preference" className="text-sm font-semibold">Scoring preference</label>
                  <span className="text-xs tabular-nums text-muted">{100 - upsidePreference}% floor · {upsidePreference}% upside</span>
                </div>
                <input
                  id="upside-preference"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={upsidePreference}
                  onChange={(event) => setUpsidePreference(Number(event.target.value))}
                  aria-label="Choose how much to prioritize upside over floor"
                  className="mt-3 w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted"><span>Prioritize floor</span><span>Prioritize upside</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ name: aName, label: "Player A" }, { name: bName, label: "Player B" }].map(({ name, label }) => (
                  <label key={label} className="text-xs font-semibold">
                    {label} minimum points
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      placeholder="Auto"
                      value={manualFloors[name] ?? ""}
                      onChange={(event) => setManualFloors((current) => ({ ...current, [name]: event.target.value }))}
                      className="mt-1 bg-background"
                      aria-label={`${label} minimum expected points`}
                    />
                  </label>
                ))}
                <p className="col-span-2 text-[10px] leading-4 text-muted">Optional: your minimum-point estimate raises that player’s modeled floor; it does not guarantee the result.</p>
              </div>
            </CardContent>
          </Card>

          {result && playerA && playerB && (
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
              {scoredA && scoredB && <>
              <ResultCard
                side="A"
                player={playerA}
                scored={scoredA}
                isWinner={scoreA > scoreB}
                leanPercent={leanA}
                injury={injuriesByName[playerA.name]}
              />
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface/70 p-4 text-muted sm:min-w-36">
                <Swords className="h-6 w-6" />
                <span className="text-xs font-semibold">{Math.abs(signedMargin).toFixed(1)} pt margin</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Engine lean</span>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/90"><div className="h-full rounded-full bg-red-500" style={{ width: `${leanA}%` }} /></div>
                <div className="flex w-full justify-between text-[10px] font-bold"><span>A {leanA}%</span><span>B {100 - leanA}%</span></div>
              </div>
              <ResultCard
                side="B"
                player={playerB}
                scored={scoredB}
                isWinner={scoreB > scoreA}
                leanPercent={100 - leanA}
                injury={injuriesByName[playerB.name]}
              />
              </>}
            </div>
          )}

          {rosterPlayers.length === 0 && <Card>
            <CardContent className="p-4 text-sm text-muted">
              <p className="font-medium text-foreground">Make it roster-specific</p>
              <p className="mt-1">Connect your ESPN or Sleeper team on the <Link href="/dashboard/sync" className="text-primary hover:underline">Sync page</Link> to put your players first here.</p>
            </CardContent>
          </Card>}

          <Card>
            <CardContent className="p-4 text-sm text-muted">
              <p className="font-medium text-foreground">How this works</p>
              <p className="mt-1">
                The estimate combines season and recency-weighted scoring, the 20th/80th percentile game outcomes, workload stability, recent scoring trend, and injury status. It defaults to a floor-first 65/35 blend; use the control above to change the floor/upside balance. Optional minimum points raise either player&apos;s modeled floor.
                The lean percentage reflects the score margin; it is not a calibrated chance of winning.
                Expand either player card for more detail and a link to their full profile.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardContent className="space-y-4 p-4">
              <label className="relative block">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search player, team, or position…"
                  className="h-11 rounded-full bg-background pl-10"
                  aria-label="Search players by name, team, or position"
                />
              </label>
              <p className="text-xs text-muted">
                {searchQuery.trim() ? `${searchResults.length} matching players` : `${rosterPlayers.length} players on your rosters · showing up to ${searchResults.length} players`}
              </p>
              {searchResults.length > 0 ? (
                <div className="divide-y divide-border rounded-xl border border-border">
                  {searchResults.map((player) => (
                    <div key={player.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
                      <PosBadge pos={player.pos} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{player.name}{rosterNameSet.has(normalizeName(player.name)) && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-primary">Your team</span>}</p>
                        <p className="text-xs text-muted">{player.team} · {pointsForFormat(player.avg_pts, receptionsByPlayer[player.name]?.avg ?? 0, scoring).toFixed(1)} avg pts</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={aName === player.name ? "default" : "secondary"}
                          aria-pressed={aName === player.name}
                          onClick={() => setAName(player.name)}
                        >
                          Player A
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={bName === player.name ? "default" : "secondary"}
                          aria-pressed={bName === player.name}
                          onClick={() => setBName(player.name)}
                        >
                          Player B
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
                  No players match that search. Try a name, team abbreviation, or position.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlayerPicker({
  label,
  value,
  onChange,
  players,
  rosterPlayerNames,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  players: PlayerRow[];
  rosterPlayerNames: Set<string>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choose a player" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {players.map((p) => (
            <SelectItem key={p.id} value={p.name}>
              {rosterPlayerNames.has(normalizeName(p.name)) ? "★ " : ""}{p.name} ({p.pos} - {p.team})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function ResultCard({
  side,
  player,
  scored,
  isWinner,
  leanPercent,
  injury,
}: {
  side: "A" | "B";
  player: PlayerRow;
  scored: ReturnType<typeof scorePlayer>;
  isWinner: boolean;
  leanPercent: number;
  injury?: InjuryRow;
}) {
  const photo = PLAYER_PHOTOS[player.name];
  return (
    <details className="group">
      <summary className="list-none cursor-pointer">
        <Card className={cn(
          "relative h-full min-h-48 overflow-hidden transition-colors",
          side === "A" ? "border-red-500/45 bg-red-950/20" : "border-white/25 bg-white/[.04]",
          isWinner && "border-emerald-400/50 bg-emerald-400/[.09] ring-1 ring-emerald-400/20",
        )}>
          {photo && <Image src={photo} alt="" fill unoptimized={photo.startsWith("http")} sizes="(max-width: 640px) 100vw, 40vw" className="object-cover object-top opacity-20" />}
          <div className={cn("absolute inset-0", side === "A" ? "bg-gradient-to-r from-red-950/90 via-red-950/65 to-black/45" : "bg-gradient-to-r from-black/85 via-black/65 to-white/10")} />
          <CardContent className="relative p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider", side === "A" ? "bg-red-500/25 text-red-100" : "bg-white/15 text-white")}>Side {side}</span>
                <PosBadge pos={player.pos} />
                <span className="truncate font-semibold text-white">{player.name}</span>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", isWinner ? "bg-emerald-400/20 text-emerald-200" : "bg-black/25 text-white/80")}>{isWinner ? "LEAN" : scored.recommendation}</span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div><p className="text-3xl font-bold tabular-nums text-white">{scored.score.toFixed(1)}</p><p className="text-xs text-white/70">engine score</p></div>
              <p className="text-right text-lg font-black tabular-nums text-white">{leanPercent}%<span className="block text-[9px] font-bold uppercase tracking-wider text-white/65">engine lean</span></p>
              <ChevronDown className="h-4 w-4 shrink-0 text-white/70 transition group-open:rotate-180" />
            </div>
            <ul className="mt-3 space-y-1 text-sm text-white/75">
              {scored.reasons.map((reason, index) => <li key={index}>· {reason}</li>)}
            </ul>
            {injury && <div className="mt-3"><StatusBadge status={injury.status} /></div>}
          </CardContent>
        </Card>
      </summary>
      <div className="mt-2 rounded-xl border border-border bg-background/60 p-4 text-sm">
        <p className="font-semibold">Player details</p>
        <p className="mt-1 text-xs leading-5 text-muted">{player.pos} · {player.team} · {player.games} games logged · {player.avg_pts.toFixed(1)} season points/game</p>
        <Link href={`/dashboard/players/${player.id}`} className="mt-3 inline-flex font-semibold text-primary hover:underline">Open {player.name}&apos;s full profile →</Link>
      </div>
    </details>
  );
}
