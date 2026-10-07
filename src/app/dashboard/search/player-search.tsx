"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ArrowUpRight, Users } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { PosBadge } from "@/components/pos-badge";
import { Input } from "@/components/ui/input";
import type { PlayerRow, Position } from "@/lib/types";

interface CatalogPlayer {
  name: string; team: string; pos: string; gsisId: string | null; headshotUrl: string | null;
  games: number; avgPts: number | null; ranked: boolean;
}

const positions: (Position | "ALL")[] = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"];

export function PlayerSearch({ players, catalog }: { players: PlayerRow[]; catalog: CatalogPlayer[] }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | "ALL">("ALL");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const byKey = new Map(players.map((player) => [`${player.name.toLowerCase()}|${player.team}`, player]));
    return catalog.filter((player) => (position === "ALL" || player.pos === position) &&
      (!needle || `${player.name} ${player.team} ${player.pos}`.toLowerCase().includes(needle))
    ).map((player) => ({ ...player, rankedPlayer: byKey.get(`${player.name.toLowerCase()}|${player.team}`) }))
      .sort((a, b) => Number(b.ranked) - Number(a.ranked) || (b.avgPts ?? -1) - (a.avgPts ?? -1) || a.name.localeCompare(b.name))
      .slice(0, 100);
  }, [players, catalog, position, query]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, team, or position…" className="h-12 border-transparent bg-background pl-10" />
        </label>
        <div className="flex gap-1 overflow-x-auto">
          {positions.map((value) => <button key={value} type="button" onClick={() => setPosition(value)} className={`rounded-xl px-3 text-xs font-black transition ${position === value ? "bg-primary text-primary-foreground" : "text-muted hover:bg-border/50 hover:text-foreground"}`}>{value === "ALL" ? "ALL" : value}</button>)}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted"><span>{results.length} players shown</span><span>Sorted by current Gridiron ranking</span></div>
      {results.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((player) => <Link key={`${player.gsisId ?? player.name}-${player.team}`} href={player.rankedPlayer ? `/dashboard/players/${player.rankedPlayer.id}` : player.gsisId ? `/dashboard/players/nfl-${encodeURIComponent(player.gsisId)}` : "/dashboard/search"} className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
          <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={58} className="shrink-0" />
          <div className="min-w-0 flex-1"><div className="truncate font-bold">{player.name}</div><div className="mt-1 flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-xs font-semibold text-muted">{player.team}</span></div></div>
          <div className="text-right"><div className="font-display text-lg font-black">{player.avgPts?.toFixed(1) ?? "—"}</div><div className="text-[9px] font-bold uppercase tracking-wider text-muted">{player.avgPts == null ? "No 2026 games" : "half-PPR"}</div></div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition group-hover:text-primary" />
        </Link>)}
      </div> : <div className="rounded-2xl border border-dashed border-border p-12 text-center"><Users className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 font-semibold">No players match that search</p><p className="mt-1 text-sm text-muted">Try a different name, team abbreviation, or position.</p></div>}
    </section>
  );
}
