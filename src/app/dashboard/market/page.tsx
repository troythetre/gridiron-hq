import { getInjuries, getNews, getPlayers } from "@/lib/data";
import { buildPlayerMarket } from "@/lib/player-market";
import type { MarketLens } from "@/lib/player-market";
import type { PlayerMarketRow } from "@/lib/types";
import profileData from "@/data/player-profiles.json";
import type { PlayerProfileData } from "@/lib/player-profile-types";
import { PlayerMarketBoard } from "./player-market-board";

export default async function PlayerMarketPage() {
  const [players, injuries, news] = await Promise.all([getPlayers(), getInjuries(), getNews()]);
  const rankedKeys = new Set(players.map((player) => `${player.name.toLowerCase()}|${player.team}`));
  const profiles = profileData as PlayerProfileData[];
  const market = {} as Record<MarketLens, PlayerMarketRow[]>;
  for (const lens of ["ppr", "half_ppr", "dynasty"] as const) {
    market[lens] = buildPlayerMarket(profiles, injuries, news, lens, rankedKeys);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_85%_0%,rgba(255,255,255,.08),transparent_42%),linear-gradient(130deg,#171717,#090909_60%,#151515)] p-6 sm:p-9">
        <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -right-1 -top-16 h-52 w-52 rounded-full border border-white/10" />
        <p className="text-xs font-black uppercase tracking-[.22em] text-white/70">The Gridiron Exchange</p>
        <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">Player Market</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Production sets the trend. Practice reports and injury news move the ticker. Follow the players whose fantasy value is climbing or sliding.</p>
      </div>
      <PlayerMarketBoard market={market} />
      <p className="rounded-xl border border-border/70 bg-surface/50 px-4 py-3 text-xs leading-5 text-muted">Gridiron Index is a fantasy signal, not a real security or a player projection. Weekly performance sets the baseline; recent reported practice and injury news can move the current index. Practice coverage depends on what appears in the connected news feeds.</p>
    </div>
  );
}
