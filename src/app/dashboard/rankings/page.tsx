import { getPlayers } from "@/lib/data";
import { RankingsTable } from "./rankings-table";
import profiles from "@/data/player-profiles.json";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import Link from "next/link";

export default async function RankingsPage() {
  const players = await getPlayers();
  const profileRows = profiles as PlayerProfileData[];
  const profilesByPlayer = new Map(profileRows.map((profile) => [`${profile.name.toLowerCase()}|${profile.team}`, profile]));
  const receptionsByPlayer = Object.fromEntries(players.map((player) => {
    const profile = profilesByPlayer.get(`${player.name.toLowerCase()}|${player.team}`);
    const weeks = profile?.weeks.filter((week) => week.fantasyPoints != null) ?? [];
    return [player.id, {
      wk1: weeks.find((week) => week.week === 1)?.receptions ?? 0,
      wk2: weeks.find((week) => week.week === 2)?.receptions ?? 0,
      avg: weeks.length ? weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0) / weeks.length : 0,
      total: weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0),
      experience: profile?.yearsExperience ?? null,
    }];
  }));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">Rankings</h1>
        <p className="text-sm text-muted">
          Current production, player bios, game logs, and trend charts. Select a name to open the full player card.
        </p>
        </div><Link href="/dashboard/compare" className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-black text-primary transition hover:bg-primary/15">Compare players →</Link></div>
      <RankingsTable players={players} receptionsByPlayer={receptionsByPlayer} />
    </div>
  );
}
