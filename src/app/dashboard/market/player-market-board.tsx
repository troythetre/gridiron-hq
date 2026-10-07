"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, CandlestickChart, Search, Zap } from "lucide-react";
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
type SortKey = "name" | "price" | "move" | "trend" | "catalyst";

function Sparkline({ points, tone }: { points: PlayerMarketRow["history"]; tone: "positive" | "negative" | "neutral" }) {
  const values = points.map((point) => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const coords = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${30 - ((value - min) / range) * 25}`).join(" ");
  const color = tone === "positive" ? "#34d399" : tone === "negative" ? "#f87171" : "#a3a3a3";
  return <svg viewBox="0 0 100 34" className="h-9 w-24 overflow-visible" aria-label="Recent price index trend" role="img"><polyline points={coords} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{values.length > 0 && <circle cx="100" cy={30 - ((values.at(-1)! - min) / range) * 25} r="2.5" fill={color} />}</svg>;
}

export function PlayerMarketBoard({ market }: { market: MarketData }) {
  const [lens, setLens] = useState<MarketLens>("half_ppr");
  const [filter, setFilter] = useState<"all" | "risers" | "fallers" | "practice">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "move", direction: "desc" });
  const players = useMemo(() => market[lens] ?? [], [market, lens]);
  const movers = useMemo(() => [...players].sort((a, b) => b.changePct - a.changePct), [players]);
  const advancers = movers.filter((player) => player.changePct > 0).length;
  const decliners = movers.filter((player) => player.changePct < 0).length;
  const breadthSpectrum = [
    { label: "Strong decliners", count: players.filter((player) => player.changePct <= -5).length, color: "bg-red-500" },
    { label: "Decliners", count: players.filter((player) => player.changePct < 0 && player.changePct > -5).length, color: "bg-orange-400" },
    { label: "Unchanged", count: players.filter((player) => player.changePct === 0).length, color: "bg-yellow-300" },
    { label: "Risers", count: players.filter((player) => player.changePct > 0 && player.changePct < 5).length, color: "bg-lime-400" },
    { label: "Strong risers", count: players.filter((player) => player.changePct >= 5).length, color: "bg-emerald-400" },
  ];
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = players.filter((player) => {
      const matchesSearch = !needle || `${player.name} ${player.team} ${player.pos}`.toLowerCase().includes(needle);
      const matchesFilter = filter === "all" || (filter === "risers" && player.changePct > 0) || (filter === "fallers" && player.changePct < 0) || (filter === "practice" && Boolean(player.catalyst));
      return matchesSearch && matchesFilter;
    });
    const trendValue = (player: PlayerMarketRow) => {
      const first = player.history[0]?.price;
      const latest = player.history.at(-1)?.price;
      return first == null || latest == null ? 0 : latest - first;
    };
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sort.key === "name") comparison = a.name.localeCompare(b.name);
      if (sort.key === "price") comparison = a.price - b.price;
      if (sort.key === "move") comparison = a.changePct - b.changePct;
      if (sort.key === "trend") comparison = trendValue(a) - trendValue(b);
      if (sort.key === "catalyst") comparison = (a.catalyst ?? "").localeCompare(b.catalyst ?? "");
      return (sort.direction === "asc" ? comparison : -comparison) || a.name.localeCompare(b.name);
    }).slice(0, 100);
  }, [players, query, filter, sort]);
  const topRiser = movers[0];
  const topFaller = [...movers].reverse().find((player) => player.changePct < 0);
  const format = lenses.find((item) => item.id === lens)!;
  const changeSort = (key: SortKey) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
  }));
  const header = (key: SortKey, label: string) => {
    const active = sort.key === key;
    const Icon = sort.direction === "asc" ? ArrowUp : ArrowDown;
    return <button type="button" onClick={() => changeSort(key)} aria-label={`Sort by ${label}`} aria-pressed={active} className="inline-flex items-center gap-1 text-left transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      {label}{active && <Icon aria-hidden="true" className="h-3 w-3" />}
    </button>;
  };

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">
      <MarketBreadthCard spectrum={breadthSpectrum} total={players.length} advancing={advancers} declining={decliners} />
      <MarketStat label="Top riser" value={topRiser ? `${topRiser.name} +${topRiser.changePct.toFixed(1)}%` : "—"} detail={topRiser?.catalyst ?? "Awaiting market signals"} tone="positive" player={topRiser} />
      <MarketStat label="Top decliner" value={topFaller ? `${topFaller.name} ${topFaller.changePct.toFixed(1)}%` : "—"} detail={topFaller?.catalyst ?? "No negative signals"} tone="negative" player={topFaller} />
    </div>

    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-1 rounded-xl bg-background p-1">
        {lenses.map((item) => <button key={item.id} type="button" onClick={() => setLens(item.id)} className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wider transition ${lens === item.id ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"}`}>{item.label}</button>)}
      </div>
      <label className="relative min-w-64 flex-1 lg:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a player…" className="border-transparent bg-background pl-10" /></label>
      <span className="text-xs text-muted">{format.note}</span>
    </div>

    <div className="flex flex-wrap gap-2 pb-1">
      {[ ["all", "All players"], ["risers", "Risers"], ["fallers", "Fallers"], ["practice", "Practice & news"] ].map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id as typeof filter)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${filter === id ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted hover:text-foreground"}`}>{label}</button>)}
    </div>

    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="hidden grid-cols-[minmax(220px,1.5fr)_100px_115px_110px_minmax(180px,1fr)] gap-4 border-b border-border bg-background/70 px-5 py-3 text-[9px] font-black uppercase tracking-[.18em] text-muted md:grid"><span>{header("name", "Player")}</span><span>{header("price", "Index")}</span><span>{header("move", "Move")}</span><span>{header("trend", "Trend")}</span><span>{header("catalyst", "Latest catalyst")}</span></div>
      <div className="divide-y divide-border/70">
        {visible.map((player) => <div key={`${player.id}-${player.team}`} className="grid gap-3 px-4 py-3 transition hover:bg-primary/[.04] sm:px-5 md:grid-cols-[minmax(220px,1.5fr)_100px_115px_110px_minmax(180px,1fr)] md:items-center md:gap-4">
          <Link href={player.id.match(/^\d{2}-\d{7}$/) ? `/dashboard/players/nfl-${encodeURIComponent(player.id)}` : "/dashboard/search"} className="flex min-w-0 items-center gap-3">
            <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={46} className="shrink-0" /><div className="min-w-0"><div className="truncate text-sm font-bold">{player.name}</div><div className="mt-1 flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-[10px] font-bold text-muted">{player.team}</span>{player.catalyst && <Zap className="h-3 w-3 text-white/70 md:hidden" />}</div></div>
          </Link>
          <div><div className="text-[9px] font-bold uppercase text-muted md:hidden">Index</div><span className="font-display text-lg font-black tabular-nums">{player.price.toFixed(2)}</span></div>
          <div className={`flex items-center gap-1 text-sm font-black tabular-nums ${player.changePct > 0 ? "text-emerald-400" : player.changePct < 0 ? "text-red-400" : "text-muted"}`}>{player.changePct > 0 ? <ArrowUpRight className="h-4 w-4" /> : player.changePct < 0 ? <ArrowDownRight className="h-4 w-4" /> : null}{player.changePct > 0 ? "+" : ""}{player.changePct.toFixed(1)}%</div>
          <div className="flex items-center justify-between"><Sparkline points={player.history} tone={player.changePct > 0 ? "positive" : player.changePct < 0 ? "negative" : "neutral"} /><span className="text-[9px] text-muted md:hidden">{player.volatility} VOL</span></div>
          <div className="min-w-0">{player.catalystUrl ? <a href={player.catalystUrl} target="_blank" rel="noreferrer" className="line-clamp-2 text-xs text-muted hover:text-primary">{player.catalyst}</a> : <p className="line-clamp-2 text-xs text-muted">{player.catalyst ?? `${player.games} games · ${player.averagePoints.toFixed(1)} ${lens === "ppr" ? "PPR" : "half-PPR"} PPG`}</p>}{player.catalystUrl && <span className="mt-1 inline-block text-[9px] font-bold uppercase tracking-wider text-primary">Practice/news catalyst ↗</span>}</div>
        </div>)}
        {visible.length === 0 && <div className="p-12 text-center"><CandlestickChart className="mx-auto h-8 w-8 text-muted" /><p className="mt-3 text-sm font-semibold">No players match this market view</p></div>}
      </div>
      {visible.length === 100 && <p className="border-t border-border px-5 py-3 text-center text-xs text-muted">Showing the first 100 results. Search to narrow the board.</p>}
    </section>
  </div>;
}

function MarketBreadthCard({
  spectrum,
  total,
  advancing,
  declining,
}: {
  spectrum: { label: string; count: number; color: string }[];
  total: number;
  advancing: number;
  declining: number;
}) {
  return <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
    <p className="text-[9px] font-black uppercase tracking-[.17em] text-muted">Market breadth</p>
    <p className="mt-2 truncate font-display text-lg font-black tabular-nums">
      <span className="text-emerald-400">{advancing} ↑</span>
      <span className="text-muted"> · </span>
      <span className="text-red-400">{declining} ↓</span>
    </p>
    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-background" role="img" aria-label={spectrum.map((segment) => `${segment.label}: ${segment.count}`).join(", ")}>
      {spectrum.map((segment) => <span key={segment.label} title={`${segment.label}: ${segment.count}`} className={`${segment.color} h-full`} style={{ width: total ? `${(segment.count / total) * 100}%` : "0%" }} />)}
    </div>
    <div className="mt-2 flex justify-between gap-1 text-[9px] text-muted" aria-hidden="true">
      {spectrum.map((segment) => <span key={segment.label} className="flex items-center gap-1"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${segment.color}`} />{segment.count}</span>)}
    </div>
  </div>;
}

function MarketStat({ label, value, detail, tone, player }: { label: string; value: string; detail: string; tone?: "positive" | "negative"; player?: PlayerMarketRow }) {
  const valueColor = tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-red-400" : "";
  return <div className="min-w-0 rounded-2xl border border-border bg-surface p-4">
    <p className="text-[9px] font-black uppercase tracking-[.17em] text-muted">{label}</p>
    <div className="mt-2 flex min-w-0 items-center gap-3">
      {player && <PlayerAvatar name={player.name} team={player.team} position={player.pos} photoUrl={player.photoUrl} size={52} className="shrink-0" />}
      <div className="min-w-0">
        <p className={`truncate font-display text-lg font-black ${valueColor}`}>{value}</p>
        <p className="mt-1 line-clamp-2 text-[10px] text-muted">{detail}</p>
      </div>
    </div>
  </div>;
}
