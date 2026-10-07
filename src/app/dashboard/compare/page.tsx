import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { getPlayers } from "@/lib/data";
import profiles from "@/data/player-profiles.json";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import { PlayerCompare } from "./player-compare";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ player?: string }> }) {
  const params = await searchParams;
  const players = await getPlayers();
  const profileRows = profiles as PlayerProfileData[];
  const profileByKey = new Map(profileRows.map((profile) => [`${profile.name.toLowerCase()}|${profile.team}`, profile]));
  const choices = players.map((player) => ({
    id: player.id,
    name: player.name,
    team: player.team,
    pos: player.pos,
    photoUrl: player.photoUrl,
    avgPts: player.avg_pts,
    totalPts: player.total_pts,
    games: player.games,
    overallRank: player.overall_rank,
    posRank: player.pos_rank,
    receptions: profileByKey.get(`${player.name.toLowerCase()}|${player.team}`)?.weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0) ?? 0,
    targets: profileByKey.get(`${player.name.toLowerCase()}|${player.team}`)?.weeks.reduce((sum, week) => sum + (week.targets ?? 0), 0) ?? 0,
  }));

  return <div className="mx-auto max-w-6xl space-y-6">
    <Link href="/dashboard/rankings" className="inline-flex items-center gap-2 text-xs font-bold text-muted transition hover:text-primary"><ArrowLeftRight className="h-4 w-4" /> Player comparison</Link>
    <header><p className="text-[10px] font-black uppercase tracking-[.2em] text-primary">Head to head</p><h1 className="mt-2 font-display text-4xl font-black">Compare players</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Put two players side by side. Scoring format updates with your fantasy preferences.</p></header>
    <PlayerCompare players={choices} initialPlayerId={Number(params.player) || undefined} />
  </div>;
}
