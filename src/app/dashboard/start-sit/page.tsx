import { getPlayers, getInjuries } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import profiles from "@/data/player-profiles.json";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import { StartSitTool } from "./start-sit-tool";

export default async function StartSitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [players, injuries, { data: sleeperRosters }, { data: espnRosters }] = await Promise.all([
    getPlayers(),
    getInjuries(),
    supabase.from("sleeper_rosters").select("roster_json").eq("profile_id", user!.id),
    supabase.from("espn_rosters").select("roster_json").eq("profile_id", user!.id),
  ]);
  const rosterPlayerNames = [
    ...((sleeperRosters ?? []) as { roster_json: { name: string }[] }[]).flatMap((roster) => roster.roster_json.map((player) => player.name)),
    ...(espnRosters ?? []).flatMap((roster) => roster.roster_json.map((player: { name: string }) => player.name)),
  ];
  const injuriesByName = Object.fromEntries(injuries.map((i) => [i.name, i]));
  const profileRows = profiles as PlayerProfileData[];
  const receptionsByPlayer = Object.fromEntries(players.map((player) => {
    const profile = profileRows.find((candidate) => candidate.name.toLowerCase() === player.name.toLowerCase() && candidate.team === player.team);
    const weeks = profile?.weeks.filter((week) => week.fantasyPoints != null) ?? [];
    return [player.name, {
      wk1: weeks.find((week) => week.week === 1)?.receptions ?? 0,
      wk2: weeks.find((week) => week.week === 2)?.receptions ?? 0,
      avg: weeks.length ? weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0) / weeks.length : 0,
    }];
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Start/Sit</h1>
        <p className="text-sm text-muted">Compare players on your ESPN and Sleeper teams first, or search any NFL player.</p>
      </div>
      <StartSitTool players={players} injuriesByName={injuriesByName} rosterPlayerNames={rosterPlayerNames} receptionsByPlayer={receptionsByPlayer} />
    </div>
  );
}
