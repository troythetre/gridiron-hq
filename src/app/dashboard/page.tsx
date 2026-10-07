import { createClient } from "@/lib/supabase/server";
import { getFantasyVideos, getInjuries, getNews, getPlayers, getWaiverPicks } from "@/lib/data";
import { buildPlayerMarket } from "@/lib/player-market";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import type { PlayerRow, SleeperRosterRow, NewsItemRow, FantasyVideoRow, InjuryRow, WaiverPickRow, PlayerMarketRow } from "@/lib/types";
import profileData from "@/data/player-profiles.json";
import { DashboardHome } from "./dashboard-home";

function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type OverviewPlayer = PlayerRow & { receptionsPerGame: number; totalReceptions: number; yearsExperience: number | null };
export type OverviewTeam = { id: string; teamName: string; leagueName: string; platform: "Sleeper" | "ESPN"; wins: number; losses: number; ties: number; players: { name: string; pos: string; team: string | null; playerId: number | null }[] };
export type OverviewPost = { id: string; body: string; created_at: string };

export default async function DashboardOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [players, injuries, waiver, news, videos, { data: sleeperRows }, { data: espnRows }, { data: postsResult }] = await Promise.all([
    getPlayers(), getInjuries(), getWaiverPicks(), getNews(), getFantasyVideos(),
    supabase.from("sleeper_rosters").select("*").eq("profile_id", user!.id).order("synced_at", { ascending: false }),
    supabase.from("espn_rosters").select("*").eq("profile_id", user!.id).order("synced_at", { ascending: false }),
    supabase.from("forum_posts").select("id,body,created_at").order("created_at", { ascending: false }).limit(4),
  ]);

  const profiles = profileData as PlayerProfileData[];
  const profileByPlayer = new Map(profiles.map((profile) => [`${normalizeName(profile.name)}|${profile.team}`, profile]));
  const overviewPlayers: OverviewPlayer[] = players.map((player) => {
    const profile = profileByPlayer.get(`${normalizeName(player.name)}|${player.team}`);
    const weeks = profile?.weeks.filter((week) => week.fantasyPoints != null) ?? [];
    return {
      ...player,
      receptionsPerGame: weeks.length ? weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0) / weeks.length : 0,
      totalReceptions: weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0),
      yearsExperience: profile?.yearsExperience ?? null,
    };
  });
  const playerByName = new Map(overviewPlayers.map((player) => [normalizeName(player.name), player]));
  const teams: OverviewTeam[] = [
    ...((sleeperRows ?? []) as SleeperRosterRow[]).map((roster) => ({
      id: `sleeper-${roster.id}`, teamName: roster.team_name ?? "My team", leagueName: roster.league_name, platform: "Sleeper" as const,
      wins: roster.wins, losses: roster.losses, ties: roster.ties,
      players: roster.roster_json.map((player) => ({ ...player, playerId: playerByName.get(normalizeName(player.name))?.id ?? null })),
    })),
    ...((espnRows ?? []) as { id: string; team_name: string; league_name: string; wins: number; losses: number; ties: number; roster_json: { name: string; pos: string; team: string | null }[] }[]).map((roster) => ({
      id: `espn-${roster.id}`, teamName: roster.team_name, leagueName: roster.league_name, platform: "ESPN" as const,
      wins: roster.wins, losses: roster.losses, ties: roster.ties,
      players: roster.roster_json.map((player) => ({ ...player, playerId: playerByName.get(normalizeName(player.name))?.id ?? null })),
    })),
  ];
  const rosteredNames = new Set(teams.flatMap((team) => team.players.map((player) => normalizeName(player.name))));
  const newsForTeam = (news as NewsItemRow[]).map((item) => ({
    item,
    rosterNames: [...rosteredNames].filter((name) => normalizeName(`${item.headline} ${item.body ?? ""}`).includes(name)),
  })).sort((a, b) => Number(b.rosterNames.length > 0) - Number(a.rosterNames.length > 0) || (b.item.item_date ?? "").localeCompare(a.item.item_date ?? ""));
  const rankedKeys = new Set(players.map((player) => `${player.name.toLowerCase()}|${player.team}`));
  const trending = buildPlayerMarket(profiles, injuries as InjuryRow[], news as NewsItemRow[], "half_ppr", rankedKeys)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 6);

  return <DashboardHome
    players={overviewPlayers}
    injuries={injuries as InjuryRow[]}
    waiver={waiver as WaiverPickRow[]}
    news={newsForTeam.slice(0, 4).map(({ item, rosterNames: matched }) => ({ ...item, onTeam: matched.length > 0, matchingPlayers: matched.map((name) => teams.flatMap((team) => team.players).find((player) => normalizeName(player.name) === name)?.name ?? name) }))}
    videos={(videos as FantasyVideoRow[]).slice(0, 3)}
    teams={teams}
    trending={trending as PlayerMarketRow[]}
    huddlePosts={(postsResult ?? []) as OverviewPost[]}
  />;
}
