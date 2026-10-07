import Image from "next/image";
import { getInjuries } from "@/lib/data";
import { getPlayers } from "@/lib/data";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/player-avatar";
import { PLAYER_PHOTOS } from "@/lib/player-visuals";

const STATUS_ORDER = ["OUT", "DOUBTFUL", "QUESTIONABLE", "MONITOR"];

export default async function InjuriesPage() {
  const [injuries, players] = await Promise.all([getInjuries(), getPlayers()]);
  const playersByName = new Map(players.map((player) => [player.name.toLowerCase(), player]));
  const sorted = [...injuries].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-red-500/20 bg-[linear-gradient(135deg,#3b1015,#19090c_70%)] p-6 sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-red-300">Player health report</p>
        <h1 className="mt-2 text-3xl font-black text-red-50 sm:text-4xl">Injury Tracker</h1>
        <p className="mt-2 text-sm text-red-100/70">Most severe first · hand-researched, with sources.</p>
      </div>

      <div className="space-y-3">
        {sorted.map((i) => {
          const player = playersByName.get(i.name.toLowerCase());
          const team = i.team ?? player?.team ?? "NFL";
          const position = i.pos ?? player?.pos ?? "?";
          const photo = PLAYER_PHOTOS[i.name] ?? player?.photoUrl;
          return (
            <Card key={i.id} className="group relative isolate overflow-hidden border-red-950/30 bg-[#100d10] shadow-sm shadow-red-950/10">
              {photo ? (
                <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[70%]">
                  <Image src={photo} alt="" fill unoptimized={photo.startsWith("http")} sizes="(max-width: 640px) 70vw, 55vw" className="object-cover object-[center_20%] opacity-45 transition duration-300 group-hover:scale-105 group-hover:opacity-60" />
                </span>
              ) : (
                <PlayerAvatar name={i.name} team={team} position={position} size={176} className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-40 transition group-hover:opacity-55" />
              )}
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#100d10] via-[#100d10]/90 via-45% to-[#100d10]/35" />
              <CardContent className="relative z-10 flex min-h-28 flex-col justify-between gap-4 p-4 sm:min-h-32 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <PosBadge pos={position} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white drop-shadow">
                      {i.name} <span className="text-sm font-medium text-white/70">· {team}</span>
                    </p>
                    <p className="mt-1 text-sm text-white/75">{i.injury}</p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col items-start gap-1 sm:max-w-[48%] sm:items-end">
                  <StatusBadge status={i.status} />
                  {i.note && <p className="text-xs leading-5 text-white/80 sm:text-right">{i.note}</p>}
                  {i.source && <p className="text-xs text-white/55 sm:text-right">{i.source}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sorted.length === 0 && (
          <p className="py-8 text-center text-muted">No injuries on file right now.</p>
        )}
      </div>
    </div>
  );
}
