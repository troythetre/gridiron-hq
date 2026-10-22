import { getInjuries, getNews } from "@/lib/data";
import { getTrendingPlayers } from "@/lib/player-analysis-trends";
import type { InjuryRow, NewsItemRow } from "@/lib/types";
import { DashboardHome } from "./dashboard-home";

// This platform is player & team analysis - the dashboard home is a
// launchpad into that (predictions, the ML showcase, trending players,
// market, parlay), not a fantasy-league command center. No roster/league
// joins here on purpose; see the deleted leagues/trades/waiver/sync pages.
export default async function DashboardOverview() {
  const [injuries, news] = await Promise.all([getInjuries(), getNews()]);
  const trending = getTrendingPlayers(5);

  return <DashboardHome
    injuries={(injuries as InjuryRow[]).slice(0, 6)}
    news={(news as NewsItemRow[]).slice(0, 5)}
    trending={trending}
  />;
}
