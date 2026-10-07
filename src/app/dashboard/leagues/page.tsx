import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getInjuries, getNews, getPlayers, getWaiverPicks } from "@/lib/data";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import type { InjuryRow, NewsItemRow, PlayerRow, SleeperRosterRow, WaiverPickRow } from "@/lib/types";
import profilesJson from "@/data/player-profiles.json";
import matchupJson from "@/data/player-matchup-analysis.json";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MyTeamAnalysis, type AnalysisTeam, type AnalysisPlayer } from "./my-team-analysis";
import { Link2, RefreshCw } from "lucide-react";
import { getAllPlayers, getLeagueRosters, getLeagueUsers, normalizeSleeperPos, sleeperPlayerName, SleeperApiError } from "@/lib/sleeper";
import { trainFantasyScoreModel } from "@/lib/fantasy-ml";

type EspnRoster = {
  id: string; espn_league_id: string; season: number; league_name: string; team_name: string;
  wins: number; losses: number; ties: number;
  roster_json: { espn_player_id: string; name: string; pos: string; team: string | null }[];
  synced_at: string;
};

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default async function MyTeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: sleeperRows }, { data: espnRows }, players, injuries, waiver, news] = await Promise.all([
    supabase.from("sleeper_rosters").select("*").eq("profile_id", user.id).order("synced_at", { ascending: false }),
    supabase.from("espn_rosters").select("*").eq("profile_id", user.id).order("synced_at", { ascending: false }),
    getPlayers(), getInjuries(), getWaiverPicks(), getNews(),
  ]);

  const playerRows = players as PlayerRow[];
  const profileRows = profilesJson as PlayerProfileData[];
  const fantasyScoreModel = trainFantasyScoreModel(profileRows);
  const matchupRows = matchupJson as unknown as { seasons: number[]; players: Record<string, NonNullable<AnalysisPlayer["matchup"]>> };
  const playerByName = new Map(playerRows.map((player) => [normalize(player.name), player]));
  const profileByPlayer = new Map(profileRows.map((profile) => [`${normalize(profile.name)}|${profile.team}`, profile]));
  const injuryByName = new Map((injuries as InjuryRow[]).map((injury) => [normalize(injury.name), injury]));
  const teams: AnalysisTeam[] = [
    ...((sleeperRows ?? []) as SleeperRosterRow[]).map((roster) => ({
      id: `sleeper-${roster.id}`, teamName: roster.team_name ?? "My team", leagueName: roster.league_name,
      platform: "Sleeper" as const, wins: roster.wins, losses: roster.losses, ties: roster.ties, syncedAt: roster.synced_at,
      players: roster.roster_json.map((player) => toAnalysisPlayer(player.name, player.pos, player.team)),
    })),
    ...((espnRows ?? []) as EspnRoster[]).map((roster) => ({
      id: `espn-${roster.id}`, teamName: roster.team_name, leagueName: roster.league_name,
      platform: "ESPN" as const, wins: roster.wins, losses: roster.losses, ties: roster.ties, syncedAt: roster.synced_at,
      players: roster.roster_json.map((player) => toAnalysisPlayer(player.name, player.pos, player.team)),
    })),
  ];

  const sleeperLeagues = [...new Set(((sleeperRows ?? []) as SleeperRosterRow[]).map((roster) => roster.sleeper_league_id))];
  const comparisons = new Map<string, NonNullable<AnalysisTeam["leagueComparison"]>>();
  if (sleeperLeagues.length) {
    let sleeperPlayers;
    try {
      sleeperPlayers = await getAllPlayers();
    } catch (error) {
      const message = error instanceof SleeperApiError ? error.message : "Sleeper player data could not be loaded.";
      sleeperLeagues.forEach((leagueId) => comparisons.set(leagueId, { teams: [], error: message }));
    }

    if (sleeperPlayers) {
      await Promise.all(sleeperLeagues.map(async (leagueId) => {
        const ownRoster = ((sleeperRows ?? []) as SleeperRosterRow[]).find((roster) => roster.sleeper_league_id === leagueId);
        if (!ownRoster) return;
        try {
          const [rosters, leagueUsers] = await Promise.all([getLeagueRosters(leagueId), getLeagueUsers(leagueId)]);
          const userById = new Map(leagueUsers.map((user) => [user.user_id, user]));
          const ownPlayerIds = new Set(ownRoster.roster_json.map((player) => player.sleeper_player_id));
          const ownNames = new Set(ownRoster.roster_json.map((player) => normalize(player.name)));
          const mappedTeams = rosters.map((roster) => {
            const rosterIds = roster.players ?? [];
            const users = roster.owner_id ? userById.get(roster.owner_id) : undefined;
            const teamName = users?.metadata?.team_name ?? users?.display_name ?? `Team ${roster.roster_id}`;
            return {
              name: teamName,
              isOwn: rosterIds.some((id) => ownPlayerIds.has(id)) || rosterIds.some((id) => ownNames.has(normalize(sleeperPlayerName(id, sleeperPlayers[id])))),
              players: rosterIds.map((id) => {
                const info = sleeperPlayers[id];
                const name = sleeperPlayerName(id, info);
                return {
                  pos: normalizeSleeperPos(info?.position ?? playerByName.get(normalize(name))?.pos ?? "?"),
                  avgPts: playerByName.get(normalize(name))?.avg_pts ?? null,
                };
              }),
            };
          });
          comparisons.set(leagueId, { teams: mappedTeams });
        } catch (error) {
          const message = error instanceof SleeperApiError ? error.message : "Sleeper league rosters could not be loaded.";
          comparisons.set(leagueId, { teams: [], error: message });
        }
      }));
    }
  }
  teams.forEach((team) => {
    if (team.platform === "Sleeper") {
      const roster = ((sleeperRows ?? []) as SleeperRosterRow[]).find((row) => `sleeper-${row.id}` === team.id);
      if (roster) team.leagueComparison = comparisons.get(roster.sleeper_league_id);
    }
  });

  function toAnalysisPlayer(name: string, pos: string, team: string | null): AnalysisPlayer {
    const row = playerByName.get(normalize(name));
    const profile = profileByPlayer.get(`${normalize(name)}|${team ?? row?.team ?? ""}`)
      ?? profileRows.find((candidate) => normalize(candidate.name) === normalize(name));
    const weeks = (profile?.weeks ?? []).map((week) => ({
      week: week.week, points: week.fantasyPoints, receptions: week.receptions ?? 0,
      targets: week.targets ?? 0, carries: week.carries ?? 0,
      yards: (week.rushingYards ?? 0) + (week.receivingYards ?? 0), touchdowns: (week.rushingTds ?? 0) + (week.receivingTds ?? 0) + (week.passingTds ?? 0),
    }));
    const scoredWeeks = weeks.filter((week) => week.points != null);
    const matchingNews = (news as NewsItemRow[]).filter((item) => normalize(`${item.headline} ${item.body ?? ""}`).includes(normalize(name))).slice(0, 3).map((item) => ({ headline: item.headline, date: item.item_date }));
    return {
      key: `${normalize(name)}-${pos}`, name, pos, team: team ?? row?.team ?? "FA", playerId: row?.id ?? null,
      avgPts: row?.avg_pts ?? (scoredWeeks.length ? scoredWeeks.reduce((sum, week) => sum + (week.points ?? 0), 0) / scoredWeeks.length : 0),
      posRank: row?.pos_rank ?? null, overallRank: row?.overall_rank ?? null,
      injury: injuryByName.get(normalize(name)) ?? null,
      weeks, yearsExperience: profile?.yearsExperience ?? null, rookieSeason: profile?.rookieSeason ?? null,
      matchup: profile?.gsisId ? matchupRows.players[profile.gsisId] ?? null : null,
      news: matchingNews,
    };
  }

  const hasTeams = teams.length > 0;
  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <header className="flex flex-wrap items-end justify-between gap-3 rounded-3xl border border-primary/15 bg-[radial-gradient(ellipse_at_85%_0%,rgba(16,185,129,.13),transparent_40%),linear-gradient(135deg,#17231e,#101412_72%)] p-6 sm:p-8">
      <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-primary">Roster analytics center</p><h1 className="mt-2 font-display text-4xl font-black sm:text-5xl">My Team</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Deep roster breakdowns, scoring trends, position depth, injury exposure, usage, and waiver fit for every connected league.</p></div>
      <Button asChild variant="secondary" size="sm"><Link href="/dashboard/sync"><RefreshCw className="mr-2 h-4 w-4" />Manage sync</Link></Button>
    </header>
    {hasTeams ? <MyTeamAnalysis teams={teams} waiver={waiver as WaiverPickRow[]} matchupSeasons={[matchupRows.seasons[0] ?? 2022, matchupRows.seasons[1] ?? 2025]} fantasyScoreModel={fantasyScoreModel} /> : <Card className="border-dashed"><CardContent className="flex flex-col items-start gap-4 p-7 sm:p-9"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10"><Link2 className="h-5 w-5 text-primary" /></span><div><h2 className="text-xl font-bold">Connect a team to unlock roster analytics</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Sync ESPN or Sleeper and this dashboard will show point production, player trends, injury risk, positional strengths and gaps, weekly scoring, and relevant waiver options.</p></div><Button asChild><Link href="/dashboard/sync">Connect ESPN or Sleeper</Link></Button></CardContent></Card>}
  </div>;
}
