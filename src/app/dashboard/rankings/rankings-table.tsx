"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlayerRow } from "@/lib/types";
import { PosBadge } from "@/components/pos-badge";
import { PlayerAvatar } from "@/components/player-avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pointsForFormat, useFantasyPreferences } from "@/components/fantasy-preferences";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"] as const;
type ReceptionStats = { wk1: number; wk2: number; avg: number; total: number; experience: number | null };

export function RankingsTable({ players, receptionsByPlayer }: { players: PlayerRow[]; receptionsByPlayer: Record<number, ReceptionStats> }) {
  const [pos, setPos] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("points");
  const { scoring, mode } = useFantasyPreferences();

  const scoredPlayers = useMemo(() => players.map((player) => {
    const receptions = receptionsByPlayer[player.id] ?? { wk1: 0, wk2: 0, avg: 0, total: 0, experience: null };
    return {
      ...player,
      displayWk1: player.wk1_pts == null ? null : pointsForFormat(player.wk1_pts, receptions.wk1, scoring),
      displayWk2: player.wk2_pts == null ? null : pointsForFormat(player.wk2_pts, receptions.wk2, scoring),
      displayTotal: pointsForFormat(player.total_pts, receptions.total, scoring),
      displayAvg: pointsForFormat(player.avg_pts, receptions.avg, scoring),
      yearsExperience: receptions.experience,
    };
  }), [players, receptionsByPlayer, scoring]);

  const filtered = useMemo(() => {
    const rankOrder = (a: (typeof scoredPlayers)[number], b: (typeof scoredPlayers)[number]) => {
      if (mode === "dynasty" && (a.yearsExperience ?? 99) !== (b.yearsExperience ?? 99)) return (a.yearsExperience ?? 99) - (b.yearsExperience ?? 99);
      return b.displayAvg - a.displayAvg;
    };
    const overallRanks = new Map([...scoredPlayers].sort(rankOrder).map((player, index) => [player.id, index + 1]));
    const byPosition = new Map<string, typeof scoredPlayers>();
    for (const player of scoredPlayers) byPosition.set(player.pos, [...(byPosition.get(player.pos) ?? []), player]);
    const posRanks = new Map<number, number>();
    for (const group of byPosition.values()) [...group].sort(rankOrder).forEach((player, index) => posRanks.set(player.id, index + 1));
    const sorted = [...scoredPlayers].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "team" ? a.team.localeCompare(b.team) || a.name.localeCompare(b.name) : rankOrder(a, b));
    return sorted.filter((p) => {
      if (pos !== "ALL" && p.pos !== pos) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    }).map((player) => ({ ...player, overallRank: overallRanks.get(player.id) ?? 0, positionRank: posRanks.get(player.id) ?? 0 }));
  }, [scoredPlayers, pos, query, sort, mode]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={pos} onValueChange={setPos}>
          <TabsList>
            {POSITIONS.map((p) => (
              <TabsTrigger key={p} value={p}>
                {p}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search players..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:w-64"
        />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-48" aria-label="Sort rankings"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="points">{mode === "dynasty" ? "Dynasty outlook" : "Fantasy points"}</SelectItem>
            <SelectItem value="name">Player name</SelectItem>
            <SelectItem value="team">NFL team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Player</th>
              <th className="px-4 py-3 font-medium">Pos</th>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 text-right font-medium">Wk1</th>
              <th className="px-4 py-3 text-right font-medium">Wk2</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Avg</th>
              <th className="px-4 py-3 text-right font-medium">Pos Rank</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-border/10">
                <td className="px-4 py-2.5 text-muted">{p.overallRank}</td>
                <td className="px-4 py-2.5 font-medium">
                  <Link href={p.profileHref ?? `/dashboard/players/${p.id}`} className="group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <PlayerAvatar name={p.name} team={p.team} position={p.pos} size={38} className="shrink-0 rounded-full transition duration-200 group-hover:scale-105" />
                    <span className="transition group-hover:text-primary">{p.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <PosBadge pos={p.pos} />
                </td>
                <td className="px-4 py-2.5 text-muted">{p.team}</td>
                <td className="px-4 py-2.5 text-right text-muted">{p.displayWk1?.toFixed(1) ?? "-"}</td>
                <td className="px-4 py-2.5 text-right text-muted">{p.displayWk2?.toFixed(1) ?? "-"}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{p.displayTotal.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right text-muted">{p.displayAvg.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right"><PositionRank rank={p.positionRank} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  No players match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PositionRank({ rank }: { rank: number }) {
  const styles = [
    "border-amber-300/70 bg-gradient-to-br from-amber-200/25 via-amber-400/15 to-yellow-700/20 text-amber-200 shadow-[0_0_14px_rgba(251,191,36,.2)]",
    "border-slate-200/60 bg-gradient-to-br from-slate-100/20 to-slate-500/10 text-slate-200",
    "border-orange-400/60 bg-gradient-to-br from-orange-300/20 to-orange-700/10 text-orange-300",
    "border-sky-400/40 bg-sky-400/10 text-sky-300",
    "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
    "border-teal-400/40 bg-teal-400/10 text-teal-300",
    "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    "border-violet-400/40 bg-violet-400/10 text-violet-300",
    "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300",
    "border-rose-400/40 bg-rose-400/10 text-rose-300",
  ];
  if (rank < 1 || rank > 10) return <span className="text-muted">{rank}</span>;
  return <span title={`Position rank ${rank}`} className={`inline-flex min-w-9 items-center justify-center gap-1 rounded-lg border px-2 py-1 font-black tabular-nums ${styles[rank - 1]}`}>
    {rank === 1 && <span aria-hidden="true">♛</span>}#{rank}
  </span>;
}
