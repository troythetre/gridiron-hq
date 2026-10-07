"use client";

import { useMemo, useRef, useState, type TouchEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import type { PlayerRow } from "@/lib/types";
import { PosBadge } from "@/components/pos-badge";
import { PlayerAvatar } from "@/components/player-avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pointsForFormat, useFantasyPreferences } from "@/components/fantasy-preferences";
import { PLAYER_PHOTOS } from "@/lib/player-visuals";
import { togglePlayerFavorite, usePlayerFavorites } from "@/lib/player-favorites";

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"] as const;
type ReceptionStats = { wk1: number; wk2: number; avg: number; total: number; experience: number | null };

export function RankingsTable({ players, receptionsByPlayer }: { players: PlayerRow[]; receptionsByPlayer: Record<number, ReceptionStats> }) {
  const [pos, setPos] = useState<string>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("points");
  const [positionDirection, setPositionDirection] = useState(1);
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
      <div className="space-y-2 md:hidden">
        {filtered.map((p) => {
          const photo = PLAYER_PHOTOS[p.name] ?? p.photoUrl;
          const isFavorite = favoriteIds.has(p.id);
          return <div key={p.id} className="relative">
          <Link
            href={p.profileHref ?? `/dashboard/players/${p.id}`}
            className="group relative isolate block min-h-24 overflow-hidden rounded-2xl border border-border bg-surface p-3 pr-14 transition hover:border-primary/50"
          >
            {photo ? (
              <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[68%]">
                <Image src={photo} alt="" fill unoptimized={photo.startsWith("http")} sizes="68vw" className="object-cover object-[center_20%] opacity-75 transition duration-300 group-hover:scale-105 group-hover:opacity-90" />
              </span>
            ) : (
              <PlayerAvatar name={p.name} team={p.team} position={p.pos} size={150} className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-45" />
            )}
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#090b10] via-[#090b10]/90 via-45% to-[#090b10]/25" />
            <span className="relative z-10 flex min-w-0 items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-wider text-white/65">Rank #{p.overallRank}</span>
                <span className="mt-0.5 block truncate text-sm font-black text-white drop-shadow">{p.name}</span>
                <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/80"><PosBadge pos={p.pos} />{p.team}</span>
              </span>
              <span className="shrink-0 rounded-lg border border-white/20 bg-black/55 px-2 py-1 text-right text-white shadow-lg">
                <span className="block font-display text-base font-black">{p.displayAvg.toFixed(1)}</span>
                <span className="block text-[9px] uppercase tracking-wider text-white/70">Avg</span>
              </span>
            </span>
            <span className="relative z-10 mt-2.5 flex justify-between gap-1.5 border-t border-white/15 pt-1.5 text-[9px] text-white/75">
              <span>Total <strong className="text-white">{p.displayTotal.toFixed(1)}</strong></span>
              <span>Pos rank <strong className="text-white">#{p.positionRank}</strong></span>
              <span>W1/W2 <strong className="text-white">{p.displayWk1?.toFixed(1) ?? "—"} / {p.displayWk2?.toFixed(1) ?? "—"}</strong></span>
            </span>
          </Link>
          <FavoriteButton name={p.name} active={isFavorite} onClick={() => togglePlayerFavorite(p.id)} className="absolute right-3 top-3 z-20" />
          </div>;
        })}
        {filtered.length === 0 && <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">No players match your filters.</p>}
      </div>

      <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-border bg-surface md:block">
        <div className="min-w-[900px] p-2">
          <div className="grid grid-cols-[48px_minmax(220px,2fr)_64px_64px_repeat(5,minmax(76px,1fr))_38px] items-center gap-2 px-3 py-2 text-xs uppercase text-muted">
            <span>Rank</span><span>Player</span><span>Pos</span><span>Team</span>
            <span className="text-right">Wk1</span><span className="text-right">Wk2</span><span className="text-right">Total</span><span className="text-right">Avg</span><span className="text-right">Pos Rank</span>
            <span aria-label="Favorite" />
          </div>
          <div className="space-y-2">
            {filtered.map((p) => {
              const photo = PLAYER_PHOTOS[p.name] ?? p.photoUrl;
              return <div key={p.id} className="relative">
              <Link
                href={p.profileHref ?? `/dashboard/players/${p.id}`}
                className="group relative isolate grid min-h-[4.75rem] grid-cols-[48px_minmax(220px,2fr)_64px_64px_repeat(5,minmax(76px,1fr))_38px] items-center gap-2 overflow-hidden rounded-xl border border-border/80 bg-surface px-3 py-1.5 text-sm transition hover:border-primary/45 hover:bg-surface-raised"
              >
                {photo ? (
                  <span aria-hidden="true" className="absolute inset-y-0 left-[8%] -z-10 w-[38%]">
                    <Image src={photo} alt="" fill unoptimized={photo.startsWith("http")} sizes="38vw" className="object-cover object-[center_20%] opacity-65 transition duration-300 group-hover:scale-105 group-hover:opacity-80" />
                  </span>
                ) : (
                  <PlayerAvatar name={p.name} team={p.team} position={p.pos} size={92} className="absolute right-[55%] top-1/2 -z-10 -translate-y-1/2 opacity-35" />
                )}
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#090b10]/90 via-[#090b10]/80 via-45% to-[#090b10]/95" />
                <span className="text-muted">{p.overallRank}</span>
                <span className="truncate font-bold text-white drop-shadow transition group-hover:text-primary">{p.name}</span>
                <span><PosBadge pos={p.pos} /></span>
                <span className="text-muted">{p.team}</span>
                <span className="text-right text-muted">{p.displayWk1?.toFixed(1) ?? "-"}</span>
                <span className="text-right text-muted">{p.displayWk2?.toFixed(1) ?? "-"}</span>
                <span className="text-right font-semibold">{p.displayTotal.toFixed(1)}</span>
                <span className="text-right text-muted">{p.displayAvg.toFixed(1)}</span>
                <span className="text-right"><PositionRank rank={p.positionRank} /></span>
                <span />
              </Link>
              <FavoriteButton name={p.name} active={favoriteIds.has(p.id)} onClick={() => togglePlayerFavorite(p.id)} className="absolute right-3 top-1/2 z-20 -translate-y-1/2" />
              </div>;
            })}
            {filtered.length === 0 && <p className="px-4 py-8 text-center text-muted">No players match your filters.</p>}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
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
      className={`${className} flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white/75 shadow-lg backdrop-blur transition hover:scale-105 hover:border-rose-300/60 hover:text-rose-300 ${active ? "text-rose-400" : ""}`}
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
