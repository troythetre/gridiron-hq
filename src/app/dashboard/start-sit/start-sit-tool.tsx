"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlayerRow, InjuryRow } from "@/lib/types";
import { compare, scorePlayer, type InjuryStatus } from "@/lib/scoring";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Swords } from "lucide-react";
import { cn } from "@/lib/utils";

function toScoreInput(p: PlayerRow, injury?: InjuryRow) {
  return {
    name: p.name,
    pos: p.pos,
    team: p.team,
    wk1_pts: p.wk1_pts,
    wk2_pts: p.wk2_pts,
    avg_pts: p.avg_pts,
    injuryStatus: (injury?.status as InjuryStatus) ?? null,
    injuryNote: injury?.note ?? undefined,
  };
}

export function StartSitTool({
  players,
  injuriesByName,
}: {
  players: PlayerRow[];
  injuriesByName: Record<string, InjuryRow>;
}) {
  const sorted = useMemo(() => [...players].sort((a, b) => a.name.localeCompare(b.name)), [players]);
  const [aName, setAName] = useState<string>(sorted[0]?.name ?? "");
  const [bName, setBName] = useState<string>(sorted[1]?.name ?? "");

  const playerA = sorted.find((p) => p.name === aName);
  const playerB = sorted.find((p) => p.name === bName);

  // Compare the two players using the scoring logic.
  const result = useMemo(() => {
    if (!playerA || !playerB) return null;
    return compare(
      toScoreInput(playerA, injuriesByName[playerA.name]),
      toScoreInput(playerB, injuriesByName[playerB.name])
    );
  }, [playerA, playerB, injuriesByName]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PlayerPicker label="Player A" value={aName} onChange={setAName} players={sorted} />
        <PlayerPicker label="Player B" value={bName} onChange={setBName} players={sorted} />
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
    </div>
  );
}

function PlayerPicker({
  label,
  value,
  onChange,
  players,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  players: PlayerRow[];
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
              {p.name} ({p.pos} - {p.team})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
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
