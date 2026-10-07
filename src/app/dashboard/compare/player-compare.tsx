"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PosBadge } from "@/components/pos-badge";
import { PlayerAvatar } from "@/components/player-avatar";
import { pointsForFormat, useFantasyPreferences } from "@/components/fantasy-preferences";

type ComparePlayer = { id: number; name: string; team: string; pos: string; avgPts: number; totalPts: number; games: number; overallRank: number | null; posRank: number | null; receptions: number; targets: number };

export function PlayerCompare({ players, initialPlayerId }: { players: ComparePlayer[]; initialPlayerId?: number }) {
  const [leftId, setLeftId] = useState(initialPlayerId && players.some((player) => player.id === initialPlayerId) ? initialPlayerId : players[0]?.id ?? 0);
  const [rightId, setRightId] = useState(players.find((player) => player.id !== initialPlayerId)?.id ?? players[1]?.id ?? players[0]?.id ?? 0);
  const { scoring } = useFantasyPreferences();
  const left = players.find((player) => player.id === leftId) ?? players[0];
  const right = players.find((player) => player.id === rightId) ?? players[1] ?? players[0];
  const rows = useMemo(() => {
    if (!left || !right) return [];
    const leftAvg = pointsForFormat(left.avgPts, left.games ? left.receptions / left.games : 0, scoring);
    const rightAvg = pointsForFormat(right.avgPts, right.games ? right.receptions / right.games : 0, scoring);
    const leftTotal = pointsForFormat(left.totalPts, left.receptions, scoring);
    const rightTotal = pointsForFormat(right.totalPts, right.receptions, scoring);
    return [
      { label: "Position", a: left.pos, b: right.pos, winner: "" },
      { label: "Fantasy PPG", a: leftAvg.toFixed(1), b: rightAvg.toFixed(1), winner: leftAvg === rightAvg ? "" : leftAvg > rightAvg ? "a" : "b" },
      { label: "Fantasy points", a: leftTotal.toFixed(1), b: rightTotal.toFixed(1), winner: leftTotal === rightTotal ? "" : leftTotal > rightTotal ? "a" : "b" },
      { label: "Games played", a: String(left.games), b: String(right.games), winner: left.games === right.games ? "" : left.games > right.games ? "a" : "b" },
      { label: "Overall rank", a: left.overallRank ? `#${left.overallRank}` : "—", b: right.overallRank ? `#${right.overallRank}` : "—", winner: left.overallRank === right.overallRank ? "" : left.overallRank != null && (right.overallRank == null || left.overallRank < right.overallRank) ? "a" : "b" },
      { label: "Position rank", a: left.posRank ? `#${left.posRank}` : "—", b: right.posRank ? `#${right.posRank}` : "—", winner: left.posRank === right.posRank ? "" : left.posRank != null && (right.posRank == null || left.posRank < right.posRank) ? "a" : "b" },
      { label: "Receptions", a: String(left.receptions), b: String(right.receptions), winner: left.receptions === right.receptions ? "" : left.receptions > right.receptions ? "a" : "b" },
      { label: "Targets", a: String(left.targets), b: String(right.targets), winner: left.targets === right.targets ? "" : left.targets > right.targets ? "a" : "b" },
    ];
  }, [left, right, scoring]);

  if (!left || !right) return <p className="rounded-xl border border-border p-5 text-sm text-muted">Ranked player data is not available.</p>;
  const chooser = (label: string, id: number, setId: (id: number) => void) => <label className="block min-w-0 flex-1"><span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-muted">{label}</span><select aria-label={label} value={id} onChange={(event) => setId(Number(event.target.value))} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-bold">{players.map((player) => <option key={player.id} value={player.id}>{player.name} · {player.pos} · {player.team}</option>)}</select></label>;
  const playerCard = (player: ComparePlayer) => <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-4"><PlayerAvatar name={player.name} team={player.team} position={player.pos} size={58} /><div className="min-w-0"><Link href={`/dashboard/players/${player.id}`} className="block truncate text-lg font-black hover:text-primary">{player.name}</Link><div className="mt-1 flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-xs text-muted">{player.team}</span></div></div></div>;

  return <section className="space-y-5 rounded-3xl border border-border bg-surface p-4 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row">{chooser("Player one", leftId, setLeftId)}{chooser("Player two", rightId, setRightId)}</div>
    <div className="grid gap-3 md:grid-cols-2">{playerCard(left)}{playerCard(right)}</div>
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className="grid grid-cols-[1fr_auto_1fr] border-b border-border bg-background/50 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-muted"><span>{left.name}</span><span className="px-3">Stat</span><span className="text-right">{right.name}</span></div>
      {rows.map((row) => <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border/60 px-4 py-3 text-sm last:border-0"><span className={`font-bold tabular-nums ${row.winner === "a" ? "text-emerald-300" : "text-foreground"}`}>{row.a}</span><span className="px-3 text-center text-[10px] font-black uppercase tracking-wide text-muted">{row.label}</span><span className={`text-right font-bold tabular-nums ${row.winner === "b" ? "text-emerald-300" : "text-foreground"}`}>{row.b}</span></div>)}
    </div>
    <p className="text-[10px] leading-5 text-muted">Points and PPG follow your current PPR / half-PPR / standard setting. Green highlights the higher value or better rank where applicable.</p>
  </section>;
}
