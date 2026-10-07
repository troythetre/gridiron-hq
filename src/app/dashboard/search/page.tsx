import { getPlayers } from "@/lib/data";
import { PlayerSearch } from "./player-search";
import profiles from "@/data/player-profiles.json";
import type { PlayerProfileData } from "@/lib/player-profile-types";

export default async function SearchPage() {
  const players = await getPlayers();
  const rankedKeys = new Set(players.map((player) => `${player.name.toLowerCase()}|${player.team}`));
  const catalog = (profiles as PlayerProfileData[]).map((profile) => {
    const weeks = profile.weeks.filter((week) => week.fantasyPoints != null);
    return {
      name: profile.name,
      team: profile.team,
      pos: profile.position,
      gsisId: profile.gsisId,
      headshotUrl: profile.headshotUrl,
      games: weeks.length,
      avgPts: weeks.length ? weeks.reduce((sum, week) => sum + (week.fantasyPoints ?? 0), 0) / weeks.length : null,
      avgReceptions: weeks.length ? weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0) / weeks.length : 0,
      yearsExperience: profile.yearsExperience,
      ranked: rankedKeys.has(`${profile.name.toLowerCase()}|${profile.team}`),
    };
  }).filter((player) => ["QB", "RB", "WR", "TE", "K", "DST"].includes(player.pos));
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-3xl border border-primary/20 bg-[radial-gradient(ellipse_at_85%_0%,rgba(245,158,11,.16),transparent_45%),linear-gradient(130deg,#111923,#090b10)] p-6 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[.22em] text-primary">Player intelligence</p>
        <h1 className="mt-2 font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">Search the league</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Find a player by name, team, or position, then open their profile for game logs, trends, bio, and fantasy production.</p>
      </div>
      <PlayerSearch players={players} catalog={catalog} />
    </div>
  );
}
