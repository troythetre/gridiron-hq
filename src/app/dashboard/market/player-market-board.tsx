"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CandlestickChart, Search, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PosBadge } from "@/components/pos-badge";
import { PlayerAvatar } from "@/components/player-avatar";
import type { MarketLens } from "@/lib/player-market";
import type { PlayerMarketRow } from "@/lib/types";

const lenses: { id: MarketLens; label: string; note: string }[] = [
  { id: "ppr", label: "PPR", note: "Full reception scoring" },
  { id: "half_ppr", label: "Half-PPR", note: "Half point per reception" },
  { id: "dynasty", label: "Dynasty", note: "Production plus age runway" },
];

type MarketData = Record<MarketLens, PlayerMarketRow[]>;

function Sparkline({ points, positive }: { points: PlayerMarketRow["history"]; positive: boolean }) {
  const values = points.map((point) => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const coords = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${30 - ((value - min) / range) * 25}`).join(" ");
  const color = positive ? "#f5f5f5" : "#737373";
  return <svg viewBox="0 0 100 34" className="h-9 w-24 overflow-visible" aria-label="Recent price index trend" role="img"><polyline points={coords} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{values.length > 0 && <circle cx="100" cy={30 - ((values.at(-1)! - min) / range) * 25} r="2.5" fill={color} />}</svg>;
}

export function PlayerMarketBoard({ market }: { market: MarketData }) {
  const [lens, setLens] = useState<MarketLens>("half_ppr");
  const [filter, setFilter] = useState<"all" | "risers" | "fallers" | "practice">("all");
  const [query, setQuery] = useState("");
  const players = useMemo(() => market[lens] ?? [], [market, lens]);
  const movers = useMemo(() => [...players].sort((a, b) => b.changePct - a.changePct), [players]);
  const advancers = movers.filter((player) => player.changePct > 0).length;
  const decliners = movers.filter((player) => player.changePct < 0).length;
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return movers.filter((player) => {
      const matchesSearch = !needle || `${player.name} ${player.team} ${player.pos}`.toLowerCase().includes(needle);
      const matchesFilter = filter === "all" || (filter === "risers" && player.changePct > 0) || (filter === "fallers" && player.changePct < 0) || (filter === "practice" && Boolean(player.catalyst));
      return matchesSearch && matchesFilter;
    }).slice(0, 100);
  }, [movers, query, filter]);
  const topRiser = movers[0];
  const topFaller = [...movers].reverse().find((player) => player.changePct < 0);
  const format = lenses.find((item) => item.id === lens)!;

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <MarketStat label="Market breadth" value={`${advancers} ↑  ·  ${decliners} ↓`} detail="Players advancing vs declining" />
      <MarketStat label="Top riser" value={topRiser ? `${topRiser.name} +${topRiser.changePct.toFixed(1)}%` : "—"} detail={topRiser?.catalyst ?? "Awaiting market signals"} positive />
      <MarketStat label="Top decliner" value={topFaller ? `${topFaller.name} ${topFaller.changePct.toFixed(1)}%` : "—"} detail={topFaller?.catalyst ?? "No negative signals"} />
    </div>

    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-1 rounded-xl bg-background p-1">
        {lenses.map((item) => <button key={item.id} type="button" onClick={() => setLens(item.id)} className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition ${lens === item.id ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"}`}>{item.label}</button>)}
      </div>
      <label className="relative min-w-64 flex-1 lg:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a player…" className="border-transparent bg-background pl-10" /></label>
      <span className="text-xs text-muted">{format.note}</span>
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {[ ["all", "All players"], ["risers", "Risers"], ["fallers", "Fallers"], ["practice", "Practice & news"] ].map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id as typeof filter)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${filter === id ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted hover:text-foreground"}`}>{label}</button>)}
    </div>

    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="hidden grid-cols-[minmax(220px,1.5fr)_100px_115px_110px_minmax(180px,1fr)] gap-4 border-b border-border bg-background/70 px-5 py-3 text-[9px] font-black uppercase tracking-[.18em] text-muted md:grid"><span>Player</span><span>Index</span><span>Move</span><span>Trend</span><span>Latest catalyst</span></div>
      <div className="divide-y divide-border/70">
        {visible.map((player) => <div key={`${player.id}-${player.team}`} className="grid gap-3 px-4 py-3 transition hover:bg-primary/[.04] sm:px-5 md:grid-cols-[minmax(220px,1.5fr)_100px_115px_110px_minmax(180px,1fr)] md:items-center md:gap-4">
          <Link href={player.id.match(/^\d{2}-\d{7}$/) ? `/dashboard/players/nfl-${encodeURIComponent(player.id)}` : "/dashboard/search"} className="flex min-w-0 items-center gap-3">
            <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={46} className="shrink-0" /><div className="min-w-0"><div className="truncate text-sm font-bold">{player.name}</div><div className="mt-1 flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-[10px] font-bold text-muted">{player.team}</span>{player.catalyst && <Zap className="h-3 w-3 text-white/70 md:hidden" />}</div></div>
          </Link>
          <div><div className="text-[9px] font-bold uppercase text-muted md:hidden">Index</div><span className="font-display text-lg font-black tabular-nums">{player.price.toFixed(2)}</span></div>
          <div className={`flex items-center gap-1 text-sm font-black tabular-nums ${player.changePct > 0 ? "text-white" : "text-muted"}`}>{player.changePct > 0 ? <ArrowUpRight className="h-4 w-4" /> : player.changePct < 0 ? <ArrowDownRight className="h-4 w-4" /> : null}{player.changePct > 0 ? "+" : ""}{player.changePct.toFixed(1)}%</div>
          <div className="flex items-center justify-between"><Sparkline points={player.history} positive={player.changePct >= 0} /><span className="text-[9px] text-muted md:hidden">{player.volatility} VOL</span></div>
          <div className="min-w-0">{player.catalystUrl ? <a href={player.catalystUrl} target="_blank" rel="noreferrer" className="line-clamp-2 text-xs text-muted hover:text-primary">{player.catalyst}</a> : <p className="line-clamp-2 text-xs text-muted">{player.catalyst ?? `${player.games} games · ${player.averagePoints.toFixed(1)} ${lens === "ppr" ? "PPR" : "half-PPR"} PPG`}</p>}{player.catalystUrl && <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider text-primary">Practice/news catalyst ↗</span>}</div>
        </div>)}
        {visible.length === 0 && <div className="p-12 text-center"><CandlestickChart className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 text-sm font-semibold">No players match this market view</p></div>}
      </div>
      {visible.length === 100 && <p className="border-t border-border px-5 py-3 text-center text-xs text-muted">Showing the first 100 results. Search to narrow the board.</p>}
    </section>
  </div>;
}

function MarketStat({ label, value, detail, positive = false }: { label: string; value: string; detail: string; positive?: boolean }) {
  return <div className="min-w-0 rounded-2xl border border-border bg-surface p-4"><p className="text-[9px] font-black uppercase tracking-[.17em] text-muted">{label}</p><p className={`mt-2 truncate font-display text-lg font-black ${positive ? "text-white" : ""}`}>{value}</p><p className="mt-1 truncate text-[10px] text-muted">{detail}</p></div>;
}
