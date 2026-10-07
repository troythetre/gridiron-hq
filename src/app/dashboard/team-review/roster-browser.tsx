"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/player-avatar";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InjuryRow } from "@/lib/types";

type RosterBrowserPlayer = {
  name: string;
  pos: string;
  team: string | null;
  playerId: number | null;
  averagePoints: number | null;
  positionRank: number | null;
  trend: number | null;
  injury: InjuryRow | null;
};

const positions = ["QB", "RB", "WR", "TE", "K", "DST"];

function trendGroup(trend: number | null) {
  if (trend == null) return "Limited data";
  if (trend > 0) return "Trending up";
  if (trend < 0) return "Trending down";
  return "Steady";
}

export function RosterBrowser({ players }: { players: RosterBrowserPlayer[] }) {
  const [position, setPosition] = useState("ALL");
  const [sort, setSort] = useState("points");
  const [groupBy, setGroupBy] = useState("none");

  const rows = useMemo(() => players
    .filter((player) => position === "ALL" || player.pos === position)
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "trend") return (b.trend ?? -Infinity) - (a.trend ?? -Infinity);
      if (sort === "rank") return (a.positionRank ?? Infinity) - (b.positionRank ?? Infinity);
      return (b.averagePoints ?? -Infinity) - (a.averagePoints ?? -Infinity);
    }), [players, position, sort]);

  const groups = groupBy === "position"
    ? positions.map((label) => ({ label, players: rows.filter((player) => player.pos === label) })).filter((group) => group.players.length)
    : groupBy === "trend"
      ? ["Trending up", "Steady", "Trending down", "Limited data"].map((label) => ({
        label,
        players: rows.filter((player) => trendGroup(player.trend) === label),
      })).filter((group) => group.players.length)
      : [{ label: "", players: rows }];

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <Select value={position} onValueChange={setPosition}>
        <SelectTrigger aria-label="Filter roster by position" className="h-10 w-auto min-w-36 bg-background text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All positions</SelectItem>
          {positions.map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger aria-label="Sort roster players" className="h-10 w-auto min-w-44 bg-background text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="points">Sort: PPG</SelectItem>
          <SelectItem value="trend">Sort: weekly trend</SelectItem>
          <SelectItem value="rank">Sort: position rank</SelectItem>
          <SelectItem value="name">Sort: name</SelectItem>
        </SelectContent>
      </Select>
      <Select value={groupBy} onValueChange={setGroupBy}>
        <SelectTrigger aria-label="Group roster players" className="h-10 w-auto min-w-40 bg-background text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Group: none</SelectItem>
          <SelectItem value="position">Group: position</SelectItem>
          <SelectItem value="trend">Group: trend</SelectItem>
        </SelectContent>
      </Select>
    </div>
    {rows.length ? groups.map((group) => <section key={group.label || "all"} className="space-y-2">
      {group.label && <h3 className="flex justify-between px-1 text-xs font-bold uppercase tracking-wider text-muted"><span>{group.label}</span><span>{group.players.length}</span></h3>}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {group.players.map((player) => {
          const href = player.playerId ? `/dashboard/players/${player.playerId}` : "/dashboard/search";
          return <Link key={`${player.name}-${player.pos}`} href={href} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background/30 p-2.5 transition hover:border-primary/40 hover:bg-background/70">
            <PlayerAvatar name={player.name} team={player.team ?? "FA"} position={player.pos} size={48} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{player.name}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2"><PosBadge pos={player.pos} /><span className="text-[10px] text-muted">{player.team ?? "FA"}{player.averagePoints == null ? "" : ` · ${player.averagePoints.toFixed(1)} PPG`}</span></span>
              {player.trend != null && <span className={`mt-1 block text-[10px] font-semibold ${player.trend > 0 ? "text-emerald-400" : player.trend < 0 ? "text-rose-400" : "text-muted"}`}>{player.trend > 0 ? "+" : ""}{player.trend.toFixed(1)} pts · W2 vs W1</span>}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">{player.positionRank != null && <span className="text-[10px] text-muted">Pos #{player.positionRank}</span>}{player.injury && <StatusBadge status={player.injury.status} />}</span>
          </Link>;
        })}
      </div>
    </section>) : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">No rostered players match this position filter.</p>}
  </div>;
}
