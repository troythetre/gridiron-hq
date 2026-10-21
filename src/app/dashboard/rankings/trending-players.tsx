"use client";

import { useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { TrendingDown, TrendingUp, X } from "lucide-react";
import { PosBadge } from "@/components/pos-badge";
import { PlayerAvatar } from "@/components/player-avatar";
import { PLAYER_PHOTOS } from "@/lib/player-visuals";
import type { TrendingPlayer, TrendingPlayers } from "@/lib/player-analysis-trends";

function TrendChart({ player, tone }: { player: TrendingPlayer; tone: "up" | "down" }) {
  const color = tone === "up" ? "#34d399" : "#f87171";
  const points = player.weeklyPoints;
  const values = points.map((point) => point.points);
  const max = Math.max(...values, player.nextWeekProjection, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const width = 100;
  const height = 48;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const coords = points.map((point, index) => {
    const x = points.length > 1 ? index * stepX : width / 2;
    const y = height - ((point.points - min) / range) * (height - 6) - 3;
    return { x, y };
  });
  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;
  const projectedY = height - ((player.nextWeekProjection - min) / range) * (height - 6) - 3;
  const gradientId = `trend-fill-${player.key.replace(/[^a-zA-Z0-9]/g, "")}`;

  return <div className="space-y-1.5">
    <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full overflow-visible" role="img" aria-label={`Weekly fantasy points trend for ${player.name}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, index) => <circle key={points[index].week} cx={c.x} cy={c.y} r="2" fill={color} />)}
      {/* Projected next week, shown as a dashed extension from the last real point. */}
      <line x1={coords.at(-1)?.x ?? 0} y1={coords.at(-1)?.y ?? 0} x2={width} y2={projectedY} stroke={color} strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />
      <circle cx={width} cy={projectedY} r="2.5" fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
    <div className="flex items-center justify-between text-[10px] text-muted">
      <span>Week {points[0]?.week}</span>
      <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-1.5 rounded-full border border-dashed" style={{ borderColor: color }} />Next week projection</span>
      <span>Week {points.at(-1)?.week}</span>
    </div>
  </div>;
}

function PlayerDialog({ player, tone, onClose }: { player: TrendingPlayer | null; tone: "up" | "down"; onClose: () => void }) {
  return <Dialog.Root open={player !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl focus:outline-none">
        {player && <>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {(() => {
                const photo = PLAYER_PHOTOS[player.name] ?? player.photoUrl;
                return photo
                  ? <Image src={photo} alt="" width={48} height={48} unoptimized={photo.startsWith("http")} className="h-12 w-12 rounded-full object-cover" />
                  : <PlayerAvatar name={player.name} team={player.team} position={player.position} size={48} />;
              })()}
              <div>
                <Dialog.Title className="text-lg font-black leading-tight">{player.name}</Dialog.Title>
                <Dialog.Description className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><PosBadge pos={player.position} />{player.team}</Dialog.Description>
              </div>
            </div>
            <Dialog.Close aria-label="Close" className="rounded-full border border-border p-2 text-muted hover:text-foreground"><X className="h-4 w-4" /></Dialog.Close>
          </div>

          <div className="mt-5">
            <TrendChart player={player} tone={tone} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border bg-background/30 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Season avg</p>
              <p className="mt-1 text-sm font-black">{player.seasonAverage}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/30 p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Last 3 avg</p>
              <p className="mt-1 text-sm font-black">{player.recentAverage}</p>
            </div>
            <div className={`rounded-xl border p-2.5 ${tone === "up" ? "border-emerald-300/30 bg-emerald-300/10" : "border-rose-300/30 bg-rose-300/10"}`}>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Next week proj.</p>
              <p className="mt-1 text-sm font-black">{player.nextWeekProjection}</p>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-4 text-muted">
            Trend compares this player&apos;s average fantasy points over their last 3 games ({player.recentAverage})
            against everything before that ({player.priorAverage}) - a {player.trendDelta > 0 ? "+" : ""}{player.trendDelta}
            pt/game swing. The next-week projection leans toward that recent form over the full-season average.
          </p>
        </>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function PlayerChip({ player, tone, onSelect }: { player: TrendingPlayer; tone: "up" | "down"; onSelect: () => void }) {
  const Icon = tone === "up" ? TrendingUp : TrendingDown;
  const toneClasses = tone === "up" ? "border-emerald-300/25 bg-emerald-300/5 hover:border-emerald-300/50" : "border-rose-300/25 bg-rose-300/5 hover:border-rose-300/50";
  return <button type="button" onClick={onSelect} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${toneClasses}`}>
    <Icon className={`h-4 w-4 shrink-0 ${tone === "up" ? "text-emerald-400" : "text-rose-400"}`} />
    <div className="min-w-0">
      <p className="truncate font-bold">{player.name}</p>
      <p className="text-[10px] text-muted">{player.position} · {player.team} · {player.trendDelta > 0 ? "+" : ""}{player.trendDelta} pt/g</p>
    </div>
  </button>;
}

export function TrendingPlayersRail({ trending }: { trending: TrendingPlayers }) {
  const [selected, setSelected] = useState<{ player: TrendingPlayer; tone: "up" | "down" } | null>(null);

  if (trending.up.length === 0 && trending.down.length === 0) return null;

  return <div className="space-y-3">
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Trending this season - click a player for the full breakdown</p>
    <div className="space-y-2">
      {trending.up.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1">
        {trending.up.map((player) => <PlayerChip key={player.key} player={player} tone="up" onSelect={() => setSelected({ player, tone: "up" })} />)}
      </div>}
      {trending.down.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1">
        {trending.down.map((player) => <PlayerChip key={player.key} player={player} tone="down" onSelect={() => setSelected({ player, tone: "down" })} />)}
      </div>}
    </div>
    <PlayerDialog player={selected?.player ?? null} tone={selected?.tone ?? "up"} onClose={() => setSelected(null)} />
  </div>;
}
