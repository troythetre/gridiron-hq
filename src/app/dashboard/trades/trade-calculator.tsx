"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { InjuryRow, PlayerRow } from "@/lib/types";
import { evaluateTrade, type InjuryStatus } from "@/lib/scoring";
import { PosBadge } from "@/components/pos-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftRight, Check, Plus, Search } from "lucide-react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/player-avatar";
import { PLAYER_PHOTOS } from "@/lib/player-visuals";

function tradeInput(player: PlayerRow, injury: InjuryRow | undefined) {
  return {
    playerId: player.id, name: player.name, pos: player.pos, team: player.team, avg_pts: player.avg_pts,
    injuryStatus: (injury?.status as InjuryStatus) ?? null, injuryNote: injury?.note ?? undefined,
  };
}

function normalize(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function PlayerPicker({ label, players, selected, onChange }: { label: string; players: PlayerRow[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => players.filter((player) => `${player.name} ${player.team} ${player.pos}`.toLowerCase().includes(query.toLowerCase())).slice(0, 80), [players, query]);
  function toggle(id: number) { onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]); }
  return <section className="rounded-3xl border border-border bg-surface p-4">
    <h2 className="text-sm font-extrabold uppercase tracking-wider">{label}</h2>
    <label className="relative mt-3 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a player" className="h-10 w-full rounded-full border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary/50" /></label>
    <div className="mt-3 max-h-[min(62vh,38rem)] space-y-2 overflow-y-auto pr-1">
      {filtered.map((player) => {
        const isSelected = selected.includes(player.id);
        const photo = PLAYER_PHOTOS[player.name] ?? player.photoUrl;
        return <button
          key={player.id}
          type="button"
          aria-pressed={isSelected}
          onClick={() => toggle(player.id)}
          className={`group relative isolate flex min-h-20 w-full items-end overflow-hidden rounded-2xl border p-3 text-left transition ${isSelected ? "border-primary/70 ring-1 ring-primary/40" : "border-border/80 hover:border-primary/50"}`}
        >
          {photo ? (
            <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[72%]">
              <Image src={photo} alt="" fill unoptimized={photo.startsWith("http")} sizes="(max-width: 1024px) 70vw, 35vw" className="object-cover object-[center_22%] opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-95" />
            </span>
          ) : (
            <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={132} className="absolute -right-1 top-1/2 -translate-y-1/2 opacity-40 transition group-hover:opacity-60" />
          )}
          <span aria-hidden="true" className={`absolute inset-0 -z-10 ${isSelected ? "bg-primary/25" : "bg-background/30"}`} />
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#090b10] via-[#090b10]/90 via-45% to-[#090b10]/20" />
          <span className="relative z-10 flex w-full items-end justify-between gap-2">
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <PosBadge pos={player.pos} />
                <span className="truncate text-sm font-black text-white drop-shadow sm:text-base">{player.name}</span>
              </span>
              <span className="mt-1.5 block text-[11px] font-semibold text-white/80">{player.team} · {player.avg_pts.toFixed(1)} PPG</span>
            </span>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border shadow-lg transition ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-white/40 bg-black/55 text-white group-hover:border-white"}`}>
              {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </span>
          </span>
        </button>;
      })}
      {filtered.length === 0 && <p className="py-5 text-center text-xs text-muted">No players match this search.</p>}
    </div>
  </section>;
}

export function TradeCalculator({ players, injuries, rosterNames, teamNames }: { players: PlayerRow[]; injuries: InjuryRow[]; rosterNames: string[]; teamNames: string[] }) {
  const rosterSet = useMemo(() => new Set(rosterNames.map(normalize)), [rosterNames]);
  const myPlayers = useMemo(() => players.filter((player) => rosterSet.has(normalize(player.name))), [players, rosterSet]);
  const [mine, setMine] = useState<number[]>([]);
  const [theirs, setTheirs] = useState<number[]>([]);
  const injuryByName = useMemo(() => new Map(injuries.map((injury) => [injury.name, injury])), [injuries]);
  const giving = players.filter((player) => mine.includes(player.id));
  const receiving = players.filter((player) => theirs.includes(player.id));
  const result = giving.length && receiving.length ? evaluateTrade(giving.map((player) => tradeInput(player, injuryByName.get(player.name))), receiving.map((player) => tradeInput(player, injuryByName.get(player.name)))) : null;
  const pool = myPlayers.length ? myPlayers : players;

  return <div className="space-y-5">
    <div className="rounded-2xl border border-border bg-surface-raised/50 p-4 text-sm leading-6 text-muted">
      {myPlayers.length ? <><span className="font-bold text-foreground">{myPlayers.length} players found across your synced teams{teamNames.length ? ` (${teamNames.join(", ")})` : ""}.</span> Select the players you would send and receive to compare production, availability, and injury context.</> : <>Connect an ESPN or Sleeper roster to prioritize your players. You can still compare any players from the full player pool. <Link className="ml-1 font-bold text-primary hover:underline" href="/dashboard/sync">Sync a team →</Link></>}
    </div>
    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
      <PlayerPicker label="You give" players={pool} selected={mine} onChange={setMine} />
      <div className="hidden pt-24 text-muted lg:block"><ArrowLeftRight className="h-6 w-6" /></div>
      <PlayerPicker label="You receive" players={players} selected={theirs} onChange={setTheirs} />
    </div>
    {result ? <Card className="border-primary/25 bg-[linear-gradient(135deg,rgba(16,185,129,.08),transparent)]"><CardHeader><CardTitle>Trade evaluation · {result.verdict === "FAIR" ? "Fair value" : result.verdict === "FAVORS_YOU" ? "Favors you" : "Favors the other side"}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-border bg-background/50 p-4"><p className="text-xs uppercase tracking-wider text-muted">You give</p><p className="mt-1 text-2xl font-black">{result.givingValue}</p><p className="mt-1 text-xs text-muted">{giving.map((player) => player.name).join(", ") || "No players selected"}</p></div><div className="rounded-xl border border-border bg-background/50 p-4"><p className="text-xs uppercase tracking-wider text-muted">You receive</p><p className="mt-1 text-2xl font-black">{result.receivingValue}</p><p className="mt-1 text-xs text-muted">{receiving.map((player) => player.name).join(", ") || "No players selected"}</p></div><div className="rounded-xl border border-border bg-background/50 p-4"><p className="text-xs uppercase tracking-wider text-muted">Value difference</p><p className="mt-1 text-2xl font-black">{Math.abs(result.percentDiff)}%</p><p className="mt-1 text-xs text-muted">Based on season points, positional value, and injury status.</p></div></CardContent></Card> : <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted">Choose players on both sides to see a trade evaluation.</p>}
  </div>;
}
