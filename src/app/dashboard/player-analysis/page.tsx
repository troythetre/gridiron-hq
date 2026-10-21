import Link from "next/link";
import { Suspense } from "react";
import { ChartCandlestick, Newspaper, SwatchBook, Trophy } from "lucide-react";
import { getPlayers, getInjuries, getNews } from "@/lib/data";
import { mergeCurrentPlayerCatalog } from "@/lib/current-player-catalog";
import { getTrendingPlayers } from "@/lib/player-analysis-trends";
import { buildPlayerMarket, type MarketLens } from "@/lib/player-market";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import type { InjuryRow, NewsItemRow, PlayerMarketRow } from "@/lib/types";
import profiles from "@/data/player-profiles.json";
import { RankingsTable } from "../rankings/rankings-table";
import { TrendingPlayersRail } from "../rankings/trending-players";
import { PlayerCompare } from "../compare/player-compare";
import { PlayerMarketBoard } from "../market/player-market-board";
import { NewsFeed } from "../news/news-feed";

// Rankings, Compare, Market, and News used to be four separate routes under
// a "Player Analysis" nav dropdown. They're all genuinely the same job -
// looking at player data - so they're one page with tabs now instead of
// four files to navigate between. Each tab is lazily fetched: switching
// tabs is a real navigation (?tab=...), not an eager Suspense-everything
// shell, because unlike Predictions' cheap local computations, Market and
// News here do real Supabase joins that shouldn't all run on every visit
// regardless of which tab you actually look at.

type Tab = "rankings" | "compare" | "market" | "news";

const TABS: { id: Tab; label: string; icon: typeof Trophy }[] = [
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "compare", label: "Compare", icon: SwatchBook },
  { id: "market", label: "Market", icon: ChartCandlestick },
  { id: "news", label: "News", icon: Newspaper },
];

function normalizeName(name: string) {
  return name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function RankingsTab() {
  const rankedPlayers = await getPlayers();
  const profileRows = profiles as PlayerProfileData[];
  const players = mergeCurrentPlayerCatalog(rankedPlayers, profileRows);
  const trending = getTrendingPlayers();
  const profilesByPlayer = new Map(profileRows.map((profile) => [`${normalizeName(profile.name)}|${profile.team}`, profile]));
  const receptionsByPlayer = Object.fromEntries(players.map((player) => {
    const profile = profilesByPlayer.get(`${normalizeName(player.name)}|${player.team}`);
    const weeks = profile?.weeks.filter((week) => week.fantasyPoints != null) ?? [];
    return [player.id, {
      wk1: weeks.find((week) => week.week === 1)?.receptions ?? 0,
      wk2: weeks.find((week) => week.week === 2)?.receptions ?? 0,
      avg: weeks.length ? weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0) / weeks.length : 0,
      total: weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0),
      experience: profile?.yearsExperience ?? null,
    }];
  }));
  return <div className="space-y-6">
    <TrendingPlayersRail trending={trending} />
    <RankingsTable players={players} receptionsByPlayer={receptionsByPlayer} />
  </div>;
}

async function CompareTab({ initialPlayerId }: { initialPlayerId?: number }) {
  const players = await getPlayers();
  const profileRows = profiles as PlayerProfileData[];
  const profileByKey = new Map(profileRows.map((profile) => [`${profile.name.toLowerCase()}|${profile.team}`, profile]));
  const choices = players.map((player) => ({
    id: player.id,
    name: player.name,
    team: player.team,
    pos: player.pos,
    photoUrl: player.photoUrl,
    avgPts: player.avg_pts,
    totalPts: player.total_pts,
    games: player.games,
    overallRank: player.overall_rank,
    posRank: player.pos_rank,
    receptions: profileByKey.get(`${player.name.toLowerCase()}|${player.team}`)?.weeks.reduce((sum, week) => sum + (week.receptions ?? 0), 0) ?? 0,
    targets: profileByKey.get(`${player.name.toLowerCase()}|${player.team}`)?.weeks.reduce((sum, week) => sum + (week.targets ?? 0), 0) ?? 0,
  }));
  return <PlayerCompare players={choices} initialPlayerId={initialPlayerId} />;
}

async function MarketTab() {
  const [players, injuries, news] = await Promise.all([getPlayers(), getInjuries(), getNews()]);
  const rankedKeys = new Set(players.map((player) => `${player.name.toLowerCase()}|${player.team}`));
  const profileRows = profiles as PlayerProfileData[];
  const market = {} as Record<MarketLens, PlayerMarketRow[]>;
  for (const lens of ["ppr", "half_ppr", "dynasty"] as const) {
    market[lens] = buildPlayerMarket(profileRows, injuries as InjuryRow[], news as NewsItemRow[], lens, rankedKeys);
  }
  return <div className="space-y-4">
    <p className="rounded-xl border border-border/70 bg-surface/50 px-4 py-3 text-xs leading-5 text-muted">Gridiron Index is a production signal, not a real security or a sportsbook price. Weekly performance sets the baseline; recent reported practice and injury news can move the current index.</p>
    <PlayerMarketBoard market={market} />
  </div>;
}

async function NewsTab() {
  const news = await getNews();
  return <NewsFeed news={news as NewsItemRow[]} />;
}

function TabLink({ tab, active, player }: { tab: typeof TABS[number]; active: boolean; player?: number }) {
  const href = `/dashboard/player-analysis?tab=${tab.id}${player ? `&player=${player}` : ""}`;
  const Icon = tab.icon;
  return <Link href={href} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[calc(var(--radius)-4px)] px-3 h-8 text-sm font-medium transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"}`}>
    <Icon className="h-3.5 w-3.5" />{tab.label}
  </Link>;
}

export default async function PlayerAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; player?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = params.tab === "compare" || params.tab === "market" || params.tab === "news" ? params.tab : "rankings";
  const initialPlayerId = Number(params.player) || undefined;

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-primary">Player analysis</p>
        <h1 className="mt-1 font-display text-3xl font-black">Player Analysis</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Current production, head-to-head comparisons, the trading-style market index, and NFL news - all one place now.</p>
      </div>
    </div>

    <div className="inline-flex h-10 items-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-1">
      {TABS.map((item) => <TabLink key={item.id} tab={item} active={tab === item.id} player={tab === "compare" ? initialPlayerId : undefined} />)}
    </div>

    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-border/40" />}>
      {tab === "rankings" && <RankingsTab />}
      {tab === "compare" && <CompareTab initialPlayerId={initialPlayerId} />}
      {tab === "market" && <MarketTab />}
      {tab === "news" && <NewsTab />}
    </Suspense>
  </div>;
}
