"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlayerRow } from "@/lib/types";
import { PosBadge } from "@/components/pos-badge";
import { PlayerAvatar } from "@/components/player-avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"] as const;

export function RankingsTable({ players }: { players: PlayerRow[] }) {
  const [pos, setPos] = useState<string>("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (pos !== "ALL" && p.pos !== pos) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [players, pos, query]);

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
                <td className="px-4 py-2.5 text-muted">{p.overall_rank}</td>
                <td className="px-4 py-2.5 font-medium">
                  <Link href={`/dashboard/players/${p.id}`} className="group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <PlayerAvatar name={p.name} team={p.team} position={p.pos} size={38} className="shrink-0 rounded-full transition duration-200 group-hover:scale-105" />
                    <span className="transition group-hover:text-primary">{p.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <PosBadge pos={p.pos} />
                </td>
                <td className="px-4 py-2.5 text-muted">{p.team}</td>
                <td className="px-4 py-2.5 text-right text-muted">{p.wk1_pts?.toFixed(1) ?? "-"}</td>
                <td className="px-4 py-2.5 text-right text-muted">{p.wk2_pts?.toFixed(1) ?? "-"}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{p.total_pts.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right text-muted">{p.avg_pts.toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right text-muted">{p.pos_rank}</td>
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
