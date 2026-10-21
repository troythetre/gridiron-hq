import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BrainCircuit, ChartCandlestick, Newspaper, ShieldAlert, TicketCheck, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import type { InjuryRow, NewsItemRow } from "@/lib/types";
import type { TrendingPlayers } from "@/lib/player-analysis-trends";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Card, CardContent } from "@/components/ui/card";

function QuickLink({ href, title, detail, icon }: { href: string; title: string; detail: string; icon: ReactNode }) {
  return <Link href={href} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/40">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block font-bold">{title}</span><span className="mt-0.5 block text-xs text-muted">{detail}</span></span>
    <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
  </Link>;
}

function SectionHeader({ title, detail, href, linkLabel = "See all" }: { title: string; detail: string; href: string; linkLabel?: string }) {
  return <div className="flex items-end justify-between gap-3">
    <div><h2 className="text-lg font-bold">{title}</h2><p className="text-xs text-muted">{detail}</p></div>
    <Link href={href} className="shrink-0 text-xs font-bold text-primary hover:underline">{linkLabel}</Link>
  </div>;
}

export function DashboardHome({
  injuries,
  news,
  trending,
}: {
  injuries: InjuryRow[];
  news: NewsItemRow[];
  trending: TrendingPlayers;
}) {
  return <div className="space-y-8">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-primary">Player &amp; team analysis</p>
      <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">Welcome back</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Jump into predictions, the analytics engine, or the player database below.</p>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <QuickLink href="/dashboard/predictions" title="Predictions" detail="Weekly, yearly, and playoff projections" icon={<TrendingUp className="h-5 w-5" />} />
      <QuickLink href="/dashboard/analytics-engine" title="Analytics Engine" detail="The ML model behind the numbers" icon={<BrainCircuit className="h-5 w-5" />} />
      <QuickLink href="/dashboard/player-analysis" title="Player Analysis" detail="Rankings, compare, market, news" icon={<Trophy className="h-5 w-5" />} />
      <QuickLink href="/dashboard/parlay" title="Market &amp; Parlay" detail="Live lines and the parlay builder" icon={<TicketCheck className="h-5 w-5" />} />
    </div>

    <section className="space-y-3">
      <SectionHeader title="Trending this season" detail="Last 3 games vs. everything before that" href="/dashboard/player-analysis?tab=rankings" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Card><CardContent className="space-y-2 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300"><TrendingUp className="h-3.5 w-3.5" />Trending up</p>
          {trending.up.length === 0 && <p className="text-xs text-muted">Nothing trending yet this season.</p>}
          {trending.up.slice(0, 5).map((player) => <div key={player.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2"><span className="truncate font-bold">{player.name}</span><PosBadge pos={player.position} /><span className="text-muted">{player.team}</span></span>
            <span className="shrink-0 font-bold text-emerald-300">+{player.trendDelta}</span>
          </div>)}
        </CardContent></Card>
        <Card><CardContent className="space-y-2 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-300"><TrendingDown className="h-3.5 w-3.5" />Trending down</p>
          {trending.down.length === 0 && <p className="text-xs text-muted">Nothing trending yet this season.</p>}
          {trending.down.slice(0, 5).map((player) => <div key={player.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2"><span className="truncate font-bold">{player.name}</span><PosBadge pos={player.position} /><span className="text-muted">{player.team}</span></span>
            <span className="shrink-0 font-bold text-rose-300">{player.trendDelta}</span>
          </div>)}
        </CardContent></Card>
      </div>
    </section>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <SectionHeader title="Latest news" detail="Most recent NFL coverage" href="/dashboard/player-analysis?tab=news" />
        <div className="space-y-2">
          {news.length === 0 && <Card><CardContent className="p-4 text-sm text-muted">No stories loaded yet.</CardContent></Card>}
          {news.map((item) => <Card key={item.id}><CardContent className="space-y-1 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><Newspaper className="h-3 w-3" />{item.source ?? "NFL"}</p>
            <p className="text-sm font-bold leading-5">{item.headline}</p>
          </CardContent></Card>)}
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="Injury report" detail="Current status notes" href="/dashboard/injuries" />
        <div className="space-y-2">
          {injuries.length === 0 && <Card><CardContent className="p-4 text-sm text-muted">No injuries reported.</CardContent></Card>}
          {injuries.map((injury) => <Card key={injury.id}><CardContent className="flex items-center justify-between gap-3 p-4">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate font-bold">{injury.name}</span>
              {injury.pos && <PosBadge pos={injury.pos} />}
              <span className="shrink-0 text-xs text-muted">{injury.team}</span>
            </span>
            <StatusBadge status={injury.status} />
          </CardContent></Card>)}
        </div>
      </section>
    </div>

    <Card className="border-dashed">
      <CardContent className="flex items-center gap-3 p-4 text-xs text-muted">
        <ChartCandlestick className="h-4 w-4 shrink-0" />
        Built from a real R/nflreadr data pipeline and a hand-implemented regression model - see the Analytics Engine for the methodology.
      </CardContent>
    </Card>
  </div>;
}
