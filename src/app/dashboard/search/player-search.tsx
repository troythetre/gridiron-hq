"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Search, ArrowUpRight, Users } from "lucide-react";
import { PlayerAvatar } from "@/components/player-avatar";
import { PosBadge } from "@/components/pos-badge";
import { Input } from "@/components/ui/input";
import type { PlayerRow, Position } from "@/lib/types";
import { pointsForFormat, useFantasyPreferences } from "@/components/fantasy-preferences";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLAYER_PHOTOS } from "@/lib/player-visuals";

interface CatalogPlayer {
  name: string; team: string; pos: string; gsisId: string | null; headshotUrl: string | null;
  games: number; avgPts: number | null; avgReceptions: number; yearsExperience: number | null; ranked: boolean;
}

const positions: (Position | "ALL")[] = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"];

export function PlayerSearch({ players, catalog }: { players: PlayerRow[]; catalog: CatalogPlayer[] }) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | "ALL">("ALL");
  const [sort, setSort] = useState("points");
  const { scoring, mode } = useFantasyPreferences();
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const byKey = new Map(players.map((player) => [`${player.name.toLowerCase()}|${player.team}`, player]));
    return catalog.filter((player) => (position === "ALL" || player.pos === position) &&
      (!needle || `${player.name} ${player.team} ${player.pos}`.toLowerCase().includes(needle))
    ).map((player) => ({
      ...player,
      displayPts: player.avgPts == null ? null : pointsForFormat(player.avgPts, player.avgReceptions, scoring),
      rankedPlayer: byKey.get(`${player.name.toLowerCase()}|${player.team}`),
    }))
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "team") return a.team.localeCompare(b.team) || a.name.localeCompare(b.name);
        if (mode === "dynasty") {
          const aExperience = a.yearsExperience ?? 99;
          const bExperience = b.yearsExperience ?? 99;
          if (aExperience !== bExperience) return aExperience - bExperience;
        }
        return Number(b.ranked) - Number(a.ranked) || (b.displayPts ?? -1) - (a.displayPts ?? -1) || a.name.localeCompare(b.name);
      })
      .slice(0, 100);
  }, [players, catalog, position, query, scoring, mode, sort]);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player, team, or position…" className="h-12 border-transparent bg-background pl-10" />
        </label>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-44" aria-label="Sort search results"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="points">{mode === "dynasty" ? "Dynasty outlook" : "Fantasy points"}</SelectItem><SelectItem value="name">Player name</SelectItem><SelectItem value="team">NFL team</SelectItem></SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1">
          {positions.map((value) => <button key={value} type="button" onClick={() => setPosition(value)} className={`rounded-xl px-3 text-xs font-black transition ${position === value ? "bg-primary text-primary-foreground" : "text-muted hover:bg-border/50 hover:text-foreground"}`}>{value === "ALL" ? "ALL" : value}</button>)}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted"><span>{results.length} players shown</span><span>{mode === "dynasty" ? "Dynasty order: experience and production" : "Redraft order: current fantasy production"}</span></div>
      {results.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((player) => {
          const photo = PLAYER_PHOTOS[player.name] ?? player.headshotUrl;
          return <Link key={`${player.gsisId ?? player.name}-${player.team}`} href={player.rankedPlayer ? `/dashboard/players/${player.rankedPlayer.id}` : player.gsisId ? `/dashboard/players/nfl-${encodeURIComponent(player.gsisId)}` : "/dashboard/search"} className="group relative isolate flex min-h-24 items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
            {photo ? (
              <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[70%]">
                <Image src={photo} alt="" fill unoptimized={photo.startsWith("http")} sizes="(max-width: 640px) 100vw, 33vw" className="object-cover object-[center_18%] opacity-55 transition duration-300 group-hover:scale-105 group-hover:opacity-70" />
              </span>
            ) : (
              <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={132} className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-35" />
            )}
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#090b10] via-[#090b10]/85 via-45% to-[#090b10]/30" />
            <span className="relative z-10 flex min-w-0 flex-1 items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-black text-white drop-shadow">{player.name}</span>
                <span className="mt-2 flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-xs font-semibold text-white/75">{player.team}</span></span>
              </span>
              <span className="shrink-0 text-right text-white drop-shadow">
                <span className="block font-display text-lg font-black">{player.displayPts?.toFixed(1) ?? "—"}</span>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-white/70">{player.avgPts == null ? "No 2026 games" : scoring === "ppr" ? "PPR" : scoring === "standard" ? "Standard" : "half-PPR"}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-white/70 transition group-hover:text-primary" />
            </span>
          </Link>;
        })}
      </div> : <div className="rounded-2xl border border-dashed border-border p-12 text-center"><Users className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 font-semibold">No players match that search</p><p className="mt-1 text-sm text-muted">Try a different name, team abbreviation, or position.</p></div>}
    </section>
  );
}
