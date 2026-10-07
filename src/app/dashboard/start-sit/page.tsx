import { getPlayers, getInjuries } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
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
    ...(sleeperRosters ?? []).flatMap((roster) => roster.roster_json.map((player) => player.name)),
    ...(espnRosters ?? []).flatMap((roster) => roster.roster_json.map((player: { name: string }) => player.name)),
  ];
  const injuriesByName = Object.fromEntries(injuries.map((i) => [i.name, i]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Start/Sit</h1>
        <p className="text-sm text-muted">Compare players on your ESPN and Sleeper teams first, or search any NFL player.</p>
      </div>
      <StartSitTool players={players} injuriesByName={injuriesByName} rosterPlayerNames={rosterPlayerNames} />
    </div>
  );
}
