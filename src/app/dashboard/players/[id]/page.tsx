import { notFound } from "next/navigation";
import { getInjuries, getNews, getPlayerById, getPlayers } from "@/lib/data";
import { PlayerProfile } from "./player-profile";
import profileData from "@/data/player-profiles.json";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import type { Position } from "@/lib/types";

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const catalogProfile = idParam.startsWith("nfl-")
    ? (profileData as PlayerProfileData[]).find((profile) => profile.gsisId === decodeURIComponent(idParam.slice(4)))
    : undefined;
  const playerId = Number(idParam);
  if (!catalogProfile && (!Number.isSafeInteger(playerId) || playerId < 1)) notFound();

  const [databasePlayer, players, allNews, injuries] = await Promise.all([
    catalogProfile ? Promise.resolve(null) : getPlayerById(playerId),
    getPlayers(),
    getNews(),
    getInjuries(),
  ]);
  const player = databasePlayer ?? (catalogProfile ? (() => {
    const weeks = catalogProfile.weeks.filter((week) => week.fantasyPoints != null);
    const total = weeks.reduce((sum, week) => sum + (week.fantasyPoints ?? 0), 0);
    return {
      id: -1,
      name: catalogProfile.name,
      pos: catalogProfile.position as Position,
      team: catalogProfile.team,
      wk1_pts: weeks.find((week) => week.week === 1)?.fantasyPoints ?? null,
      wk2_pts: weeks.find((week) => week.week === 2)?.fantasyPoints ?? null,
      total_pts: total,
      games: weeks.length,
      avg_pts: weeks.length ? total / weeks.length : 0,
      pos_rank: null,
      overall_rank: null,
    };
  })() : null);
  if (!player) notFound();

  const playerProfile = catalogProfile ?? (profileData as PlayerProfileData[]).find(
    (profile) => profile.name === player.name && profile.team === player.team
  ) ?? null;
  const matchingPlayerNews = allNews.filter((item) =>
    `${item.headline} ${item.body ?? ""}`.toLowerCase().includes(player.name.toLowerCase())
  );
  const newsAreGeneral = matchingPlayerNews.length === 0;
  const playerNews = matchingPlayerNews;
  const injury = injuries.find((item) => item.name.toLowerCase() === player.name.toLowerCase()) ?? null;

  return (
    <PlayerProfile
      player={player}
      profile={playerProfile}
      players={players}
      news={playerNews}
      newsAreGeneral={newsAreGeneral}
      injury={injury}
    />
  );
}
