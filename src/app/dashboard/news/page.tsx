import { getNews } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { NewsFeed } from "./news-feed";

export default async function NewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [news, { data: sleeperRosters }, { data: espnRosters }] = await Promise.all([
    getNews(),
    supabase.from("sleeper_rosters").select("roster_json").eq("profile_id", user!.id),
    supabase.from("espn_rosters").select("roster_json").eq("profile_id", user!.id),
  ]);
  const teamPlayerNames = [
    ...(sleeperRosters ?? []).flatMap((roster) => roster.roster_json.map((player) => player.name)),
    ...(espnRosters ?? []).flatMap((roster) => roster.roster_json.map((player: { name: string }) => player.name)),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fantasy News</h1>
        <p className="text-sm text-muted">Stories about players on your ESPN and Sleeper teams come first, alongside broader NFL and fantasy coverage.</p>
      </div>
      <NewsFeed news={news} teamPlayerNames={teamPlayerNames} />
    </div>
  );
}
