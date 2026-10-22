"use client";

import { useMemo, useRef, useState, type TouchEvent } from "react";
import Link from "next/link";
import { Heart, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { PlayerRow } from "@/lib/types";
import { PosBadge } from "@/components/pos-badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pointsForFormat, useFantasyPreferences } from "@/components/fantasy-preferences";
import { togglePlayerFavorite, usePlayerFavorites } from "@/lib/player-favorites";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"] as const;
type ReceptionStats = { wk1: number; wk2: number; avg: number; total: number; experience: number | null };

// A player is "trending up/down" here if week 2 outscored (or undershot)
// week 1 by more than a point - a quick visual cue, not the full
// multi-game analysis the Player Analysis trending rail does.
const TREND_THRESHOLD = 1;

export function RankingsTable({ players, receptionsByPlayer }: { players: PlayerRow[]; receptionsByPlayer: Record<number, ReceptionStats> }) {
  const [pos, setPos] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("points");
  const [positionDirection, setPositionDirection] = useState(1);
  // The merged catalog can run several hundred players deep. Rendering (and
  // hydrating) every one of them at once - in both the mobile card layout
  // and the desktop table below - is what made this page feel slow to open.
  // Show a page at a time instead; "Show more" reveals the rest on demand.
  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const favoriteIds = usePlayerFavorites();
  const { scoring, mode } = useFantasyPreferences();

  const changePosition = (nextPosition: string) => {
    const nextIndex = POSITIONS.indexOf(nextPosition as (typeof POSITIONS)[number]);
    const currentIndex = POSITIONS.indexOf(pos as (typeof POSITIONS)[number]);
    if (nextIndex < 0 || nextIndex === currentIndex) return;
    setPositionDirection(nextIndex > currentIndex ? 1 : -1);
    setPos(nextPosition);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 64 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    const currentIndex = POSITIONS.indexOf(pos as (typeof POSITIONS)[number]);
    const nextIndex = Math.max(0, Math.min(POSITIONS.length - 1, currentIndex + (deltaX < 0 ? 1 : -1)));
    if (nextIndex !== currentIndex) changePosition(POSITIONS[nextIndex]);
  };

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

  // Reset pagination whenever the filtered set changes shape so a new
  // search/position/sort always starts from the top instead of showing an
  // empty tail of a now-shorter list.
  const filterKey = `${pos}|${query}|${sort}|${mode}`;
  const [previousFilterKey, setPreviousFilterKey] = useState(filterKey);
  if (previousFilterKey !== filterKey) {
    setPreviousFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={pos} onValueChange={changePosition}>
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

      <div
        key={pos}
        className={`position-cube-panel position-cube-panel-${positionDirection > 0 ? "next" : "previous"} space-y-2`}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={handleTouchEnd}
        aria-live="polite"
      >
      {/* Mobile: a leaderboard-style stat card per player. Medal badge for
          the top 3 overall, a trend arrow comparing week 2 to week 1, no
          headshots. */}
      <div className="space-y-2 md:hidden">
        {visible.map((p) => {
          const isFavorite = favoriteIds.has(p.id);
          return <div key={p.id} className="relative">
          <Link
            href={p.profileHref ?? `/dashboard/players/${p.id}`}
            className="group block rounded-2xl border border-border bg-surface p-3 pr-14 transition hover:border-primary/50 hover:bg-surface-raised"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <RankBadge rank={p.overallRank} />
                <div className="min-w-0">
                  <span className="block truncate text-sm font-black text-foreground transition group-hover:text-primary">{p.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted"><PosBadge pos={p.pos} />{p.team}</span>
                </div>
              </div>
              <div className="shrink-0 rounded-lg border border-border bg-surface-raised px-2 py-1 text-right">
                <span className="block font-display text-base font-black text-foreground">{p.displayAvg.toFixed(1)}</span>
                <span className="block text-[9px] uppercase tracking-wider text-muted">Avg</span>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-1.5 border-t border-border pt-1.5 text-[9px] text-muted">
              <span>Total <strong className="text-foreground">{p.displayTotal.toFixed(1)}</strong></span>
              <span>Pos rank <strong className="text-foreground">#{p.positionRank}</strong></span>
              <span className="flex items-center gap-1">
                W1/W2 <strong className="text-foreground">{p.displayWk1?.toFixed(1) ?? "—"} / {p.displayWk2?.toFixed(1) ?? "—"}</strong>
                <TrendIndicator wk1={p.displayWk1} wk2={p.displayWk2} />
              </span>
            </div>
          </Link>
          <FavoriteButton name={p.name} active={isFavorite} onClick={() => togglePlayerFavorite(p.id)} className="absolute right-3 top-3 z-20" />
          </div>;
        })}
        {filtered.length === 0 && <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No players match your filters.</p>}
        {hasMore && <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="w-full rounded-2xl border border-border bg-surface py-2.5 text-xs font-bold text-muted transition hover:border-primary/40 hover:text-foreground">
          Show more ({filtered.length - visible.length} remaining)
        </button>}
      </div>

      {/* Desktop: a leaderboard table - medal badge for the top 3 overall,
          a dedicated Trend column (week 2 vs week 1), sticky header. */}
      <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-border bg-surface md:block">
        <div className="min-w-[920px] p-2">
          <div className="sticky top-0 z-10 grid grid-cols-[52px_minmax(220px,2fr)_64px_64px_repeat(5,minmax(76px,1fr))_44px_38px] items-center gap-2 rounded-t-lg bg-surface px-3 py-2 text-xs uppercase text-muted">
            <span>Rank</span><span>Player</span><span>Pos</span><span>Team</span>
            <span className="text-right">Wk1</span><span className="text-right">Wk2</span><span className="text-right">Total</span><span className="text-right">Avg</span><span className="text-right">Pos Rank</span>
            <span className="text-center">Trend</span>
            <span aria-label="Favorite" />
          </div>
          <div className="space-y-1">
            {visible.map((p) => {
              return <div key={p.id} className="relative">
              <Link
                href={p.profileHref ?? `/dashboard/players/${p.id}`}
                className="group grid min-h-12 grid-cols-[52px_minmax(220px,2fr)_64px_64px_repeat(5,minmax(76px,1fr))_44px_38px] items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm transition hover:border-primary/35 hover:bg-surface-raised"
              >
                <RankBadge rank={p.overallRank} />
                <span className="truncate font-bold text-foreground transition group-hover:text-primary">{p.name}</span>
                <span><PosBadge pos={p.pos} /></span>
                <span className="text-muted">{p.team}</span>
                <span className="text-right text-muted">{p.displayWk1?.toFixed(1) ?? "-"}</span>
                <span className="text-right text-muted">{p.displayWk2?.toFixed(1) ?? "-"}</span>
                <span className="text-right font-semibold text-foreground">{p.displayTotal.toFixed(1)}</span>
                <span className="text-right text-muted">{p.displayAvg.toFixed(1)}</span>
                <span className="text-right"><PositionRank rank={p.positionRank} /></span>
                <span className="flex justify-center"><TrendIndicator wk1={p.displayWk1} wk2={p.displayWk2} /></span>
                <span />
              </Link>
              <FavoriteButton name={p.name} active={favoriteIds.has(p.id)} onClick={() => togglePlayerFavorite(p.id)} className="absolute right-3 top-1/2 z-20 -translate-y-1/2" />
              </div>;
            })}
            {filtered.length === 0 && <p className="px-4 py-8 text-center text-muted">No players match your filters.</p>}
          </div>
          {hasMore && <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="mt-2 w-full rounded-xl border border-border bg-surface py-2.5 text-xs font-bold text-muted transition hover:border-primary/40 hover:text-foreground">
            Show more ({filtered.length - visible.length} remaining)
          </button>}
        </div>
      </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medalStyles: Record<number, string> = {
    1: "border-amber-300/70 bg-gradient-to-br from-amber-200/30 via-amber-400/20 to-yellow-700/20 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,.25)]",
    2: "border-slate-200/60 bg-gradient-to-br from-slate-100/25 to-slate-500/10 text-slate-200",
    3: "border-orange-400/60 bg-gradient-to-br from-orange-300/25 to-orange-700/10 text-orange-300",
  };
  if (rank in medalStyles) {
    return <span title={`#${rank} overall`} className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-black tabular-nums ${medalStyles[rank]}`}>
      {rank}
    </span>;
  }
  return <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-sm font-semibold tabular-nums text-muted">{rank}</span>;
}

function TrendIndicator({ wk1, wk2 }: { wk1: number | null; wk2: number | null }) {
  if (wk1 == null || wk2 == null) {
    return <Minus className="h-3.5 w-3.5 shrink-0 text-muted/50" aria-label="Not enough weeks played to show a trend" />;
  }
  const delta = wk2 - wk1;
  if (delta > TREND_THRESHOLD) {
    return <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-label={`Up ${delta.toFixed(1)} points from week 1 to week 2`} />;
  }
  if (delta < -TREND_THRESHOLD) {
    return <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-400" aria-label={`Down ${Math.abs(delta).toFixed(1)} points from week 1 to week 2`} />;
  }
  return <Minus className="h-3.5 w-3.5 shrink-0 text-muted/70" aria-label="Roughly flat from week 1 to week 2" />;
}

function FavoriteButton({ name, active, onClick, className }: { name: string; active: boolean; onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      aria-label={`${active ? "Remove" : "Add"} ${name} ${active ? "from" : "to"} favorites`}
      aria-pressed={active}
      title={active ? "Remove from favorites" : "Add to favorites"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`${className} flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-muted shadow-sm backdrop-blur transition hover:scale-105 hover:border-rose-300/60 hover:text-rose-400 ${active ? "text-rose-400" : ""}`}
    >
      <Heart className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
    </button>
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
