"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlayerRow, InjuryRow } from "@/lib/types";
import { compare, scorePlayer, type InjuryStatus } from "@/lib/scoring";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { pointsForFormat, useFantasyPreferences } from "@/components/fantasy-preferences";

type ReceptionStats = { wk1: number; wk2: number; avg: number };

function toScoreInput(p: PlayerRow, injury: InjuryRow | undefined, receptions: ReceptionStats | undefined, scoring: "standard" | "half_ppr" | "ppr") {
  const stats = receptions ?? { wk1: 0, wk2: 0, avg: 0 };
  return {
    name: p.name,
    pos: p.pos,
    team: p.team,
    wk1_pts: p.wk1_pts == null ? null : pointsForFormat(p.wk1_pts, stats.wk1, scoring),
    wk2_pts: p.wk2_pts == null ? null : pointsForFormat(p.wk2_pts, stats.wk2, scoring),
    avg_pts: pointsForFormat(p.avg_pts, stats.avg, scoring),
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
      toScoreInput(playerA, injuriesByName[playerA.name], receptionsByPlayer[playerA.name], scoring),
      toScoreInput(playerB, injuriesByName[playerB.name], receptionsByPlayer[playerB.name], scoring)
    );
  }, [playerA, playerB, injuriesByName, receptionsByPlayer, scoring]);

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

          {result && playerA && playerB && (
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
              <ResultCard
                player={playerA}
                scored={result.winner.name === playerA.name ? result.winner : result.loser}
                isWinner={result.winner.name === playerA.name}
                injury={injuriesByName[playerA.name]}
              />
              <div className="flex flex-col items-center justify-center gap-1 text-muted">
                <Swords className="h-6 w-6" />
                <span className="text-xs">margin: {Math.abs(result.margin).toFixed(1)} pts</span>
              </div>
              <ResultCard
                player={playerB}
                scored={result.winner.name === playerB.name ? result.winner : result.loser}
                isWinner={result.winner.name === playerB.name}
                injury={injuriesByName[playerB.name]}
              />
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
                Score = season avg points/game + (Week-over-week trend × 0.3) − an injury-status penalty.
                It&apos;s intentionally simple and shown in full above each player&apos;s card, so you can
                see exactly why the engine picked a winner instead of trusting a black box.
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
  player,
  scored,
  isWinner,
  injury,
}: {
  player: PlayerRow;
  scored: ReturnType<typeof scorePlayer>;
  isWinner: boolean;
  injury?: InjuryRow;
}) {
  return (
    <Card className={cn(isWinner && "border-success/50 ring-1 ring-success/30")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PosBadge pos={player.pos} />
            <Link href={`/dashboard/players/${player.id}`} className="font-semibold transition hover:text-primary hover:underline">
              {player.name}
            </Link>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              isWinner ? "bg-success/10 text-success" : "bg-border/40 text-muted"
            )}
          >
            {isWinner ? "START" : scored.recommendation}
          </span>
        </div>
        <p className="mt-3 text-3xl font-bold">{scored.score.toFixed(1)}</p>
        <p className="text-xs text-muted">engine score</p>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {scored.reasons.map((r, i) => (
            <li key={i}>· {r}</li>
          ))}
        </ul>
        {injury && (
          <div className="mt-3">
            <StatusBadge status={injury.status} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
