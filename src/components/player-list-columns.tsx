import Link from "next/link";
import { Eye, Star, Target } from "lucide-react";
import type { PlayerListType } from "@/lib/player-lists";
import type { PlayerRow } from "@/lib/types";

const LIST_META: Record<PlayerListType, { label: string; icon: typeof Star; accent: string }> = {
  favorite: { label: "Favorites", icon: Star, accent: "text-amber-300" },
  target: { label: "Targets", icon: Target, accent: "text-violet-300" },
  observed: { label: "Observed", icon: Eye, accent: "text-sky-300" },
};

/** One column (icon + label + count + rows) of a favorite/target/observed
 * list. Shared by the account page's betting-profile card and the public
 * profile page so the two stay visually identical. */
export function PlayerListColumn({ listType, players }: { listType: PlayerListType; players: PlayerRow[] }) {
  const meta = LIST_META[listType];
  const Icon = meta.icon;
  return <div className="space-y-2">
    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${meta.accent}`}>
      <Icon className="h-3.5 w-3.5" />{meta.label}
      <span className="text-muted">({players.length})</span>
    </div>
    <div className="space-y-1">
      {players.length === 0 && <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted">None yet.</p>}
      {players.map((player) => <Link
        key={player.id}
        href={`/dashboard/players/${player.id}`}
        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/30 px-3 py-2 text-xs transition hover:border-violet-400/40"
      >
        <span className="truncate font-bold">{player.name}</span>
        <span className="shrink-0 text-muted">{player.pos} · {player.team}</span>
      </Link>)}
    </div>
  </div>;
}

export function PlayerListGrid({ lists }: { lists: Record<PlayerListType, PlayerRow[]> }) {
  return <div className="grid gap-4 sm:grid-cols-3">
    <PlayerListColumn listType="favorite" players={lists.favorite} />
    <PlayerListColumn listType="target" players={lists.target} />
    <PlayerListColumn listType="observed" players={lists.observed} />
  </div>;
}
