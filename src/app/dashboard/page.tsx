import { createClient } from "@/lib/supabase/server";
import { getFantasyVideos, getInjuries, getNews, getPlayers, getWaiverPicks } from "@/lib/data";
import { buildPlayerMarket } from "@/lib/player-market";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import type { PlayerRow, SleeperRosterRow, NewsItemRow, FantasyVideoRow, InjuryRow, WaiverPickRow, PlayerMarketRow } from "@/lib/types";
import { recommendTrades, type RecommendationRoster } from "@/lib/trade-recommendations";
import type { RecommendedTrade } from "@/lib/trade-recommendations";
import profileData from "@/data/player-profiles.json";
import { DashboardHome } from "./dashboard-home";

function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type OverviewPlayer = PlayerRow & {
  receptionsPerGame: number;
  totalReceptions: number;
  yearsExperience: number | null;
  recentTdLast3: number;
  latestTdWeek: number | null;
};
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

  const { data: ownMemberships, error: ownMembershipsError } = await supabase
    .from("league_members")
    .select("id, league_id, team_name")
    .eq("profile_id", user!.id);
  if (ownMembershipsError) throw ownMembershipsError;
  const leagueIds = [...new Set((ownMemberships ?? []).map((membership) => membership.league_id))];
  const { data: nativeMembers, error: nativeMembersError } = leagueIds.length
    ? await supabase
        .from("league_members")
        .select("id, profile_id, league_id, team_name, leagues(name)")
        .in("league_id", leagueIds)
    : { data: [], error: null };
  if (nativeMembersError) throw nativeMembersError;
  const nativeMemberIds = (nativeMembers ?? []).map((membership) => membership.id);
  const { data: nativeRosterRows, error: nativeRosterError } = nativeMemberIds.length
    ? await supabase
        .from("roster_slots")
        .select("league_member_id, players(*)")
        .in("league_member_id", nativeMemberIds)
    : { data: [], error: null };
  if (nativeRosterError) throw nativeRosterError;

  const rosterPlayersByMember = new Map<string, PlayerRow[]>();
  for (const row of nativeRosterRows ?? []) {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!player) continue;
    const rosterPlayers = rosterPlayersByMember.get(row.league_member_id) ?? [];
    rosterPlayers.push(player as PlayerRow);
    rosterPlayersByMember.set(row.league_member_id, rosterPlayers);
  }
  const recommendationRosters: RecommendationRoster[] = (nativeMembers ?? []).map((membership) => {
    const league = Array.isArray(membership.leagues) ? membership.leagues[0] : membership.leagues;
    return {
      memberId: membership.id,
      leagueId: membership.league_id,
      leagueName: league?.name ?? "League",
      teamName: membership.team_name,
      profileId: membership.profile_id,
      players: rosterPlayersByMember.get(membership.id) ?? [],
    };
  });

  const profiles = profileData as PlayerProfileData[];
  const profileByPlayer = new Map(profiles.map((profile) => [`${normalizeName(profile.name)}|${profile.team}`, profile]));
  const overviewPlayers: OverviewPlayer[] = players.map((player) => {
    const profile = profileByPlayer.get(`${normalizeName(player.name)}|${player.team}`);
    const weeks = profile?.weeks.filter((week) => week.fantasyPoints != null).sort((a, b) => a.week - b.week) ?? [];
    const recentWeeks = weeks.slice(-3);
    const touchdowns = (week: (typeof recentWeeks)[number]) =>
      (week.passingTds ?? 0) + (week.rushingTds ?? 0) + (week.receivingTds ?? 0);
    const latestTdWeek = [...recentWeeks].reverse().find((week) => touchdowns(week) > 0)?.week ?? null;
    return {
      ...player,
      receptionsPerGame: weeks.length ? weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0) / weeks.length : 0,
      totalReceptions: weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0),
      yearsExperience: profile?.yearsExperience ?? null,
      recentTdLast3: recentWeeks.reduce((sum, week) => sum + touchdowns(week), 0),
      latestTdWeek,
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
  const recommendedTrades: RecommendedTrade[] = user
    ? recommendTrades(recommendationRosters, injuries as InjuryRow[], user.id)
    : [];

  return <DashboardHome
    players={overviewPlayers}
    injuries={injuries as InjuryRow[]}
    waiver={waiver as WaiverPickRow[]}
    news={newsForTeam.slice(0, 4).map(({ item, rosterNames: matched }) => ({ ...item, onTeam: matched.length > 0, matchingPlayers: matched.map((name) => teams.flatMap((team) => team.players).find((player) => normalizeName(player.name) === name)?.name ?? name) }))}
    videos={(videos as FantasyVideoRow[]).slice(0, 3)}
    teams={teams}
    trending={trending as PlayerMarketRow[]}
    recommendedTrades={recommendedTrades}
    huddlePosts={(postsResult ?? []) as OverviewPost[]}
  />;
}
