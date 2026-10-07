"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, ChevronDown, MessageCircle, Newspaper, Search, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import type { InjuryRow, NewsItemRow, FantasyVideoRow, WaiverPickRow, PlayerMarketRow } from "@/lib/types";
import { PlayerAvatar } from "@/components/player-avatar";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFantasyPreferences, pointsForFormat } from "@/components/fantasy-preferences";
import type { OverviewPlayer, OverviewPost, OverviewTeam } from "./page";
import type { RecommendedTrade } from "@/lib/trade-recommendations";
import { teamColors } from "@/lib/player-visuals";

type PersonalizedNews = NewsItemRow & { onTeam: boolean; matchingPlayers: string[] };

export function DashboardHome({
  players, injuries, waiver, news, videos, teams, trending, recommendedTrades, huddlePosts,
}: {
  players: OverviewPlayer[]; injuries: InjuryRow[]; waiver: WaiverPickRow[]; news: PersonalizedNews[];
  videos: FantasyVideoRow[]; teams: OverviewTeam[]; trending: PlayerMarketRow[];
  recommendedTrades: RecommendedTrade[]; huddlePosts: OverviewPost[];
}) {
  const { scoring, mode } = useFantasyPreferences();
  const [expandedNewsId, setExpandedNewsId] = useState<number | null>(null);
  const points = (player: OverviewPlayer) => pointsForFormat(player.avg_pts, player.receptionsPerGame, scoring);
  const leaders = [...players].sort((a, b) => {
    if (mode === "dynasty" && (a.yearsExperience ?? 99) !== (b.yearsExperience ?? 99)) return (a.yearsExperience ?? 99) - (b.yearsExperience ?? 99);
    return points(b) - points(a);
  }).slice(0, 20);
  const rosterNames = new Set(teams.flatMap((team) => team.players.map((player) => player.name.toLowerCase())));
  const rosterInjuries = injuries.filter((injury) => rosterNames.has(injury.name.toLowerCase())).slice(0, 4);
  const onTeamNews = news.filter((item) => item.onTeam);
  const recentTdPlayers = players
    .filter((player) => player.recentTdLast3 > 0)
    .sort((a, b) => b.recentTdLast3 - a.recentTdLast3 || (b.latestTdWeek ?? 0) - (a.latestTdWeek ?? 0))
    .slice(0, 6);

  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_85%_0%,rgba(245,158,11,.14),transparent_42%),linear-gradient(130deg,#171717,#090909_60%,#151515)] p-6 sm:p-9">
      <div className="absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-primary">Your fantasy command center</p>
      <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">The huddle starts here.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Your teams, player movement, stories, stats, and film study in one personalized feed.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="sm"><Link href="/dashboard/start-sit">Make a lineup call <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        <Button asChild variant="secondary" size="sm"><Link href="/dashboard/search"><Search className="mr-2 h-4 w-4" />Find a player</Link></Button>
      </div>
    </header>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="Players tracked" value={players.length.toLocaleString()} detail={`${scoringLabel(scoring)} rankings`} icon={<Sparkles className="h-4 w-4" />} color="#38bdf8" />
      <StatTile label="Your teams" value={teams.length.toString()} detail={teams.length ? "ESPN + Sleeper" : "Connect a roster"} icon={<ShieldAlert className="h-4 w-4" />} color="#a78bfa" />
      <StatTile label="Roster news" value={onTeamNews.length.toString()} detail="Stories tied to your players" icon={<Newspaper className="h-4 w-4" />} color="#f59e0b" />
      <StatTile label="Trending" value={trending.filter((player) => player.changePct > 0).length.toString()} detail="Players gaining momentum" icon={<TrendingUp className="h-4 w-4" />} color="#34d399" />
    </div>

    <section className="space-y-4">
      <SectionHeader title="Recent touchdowns" detail="Scored in the last three logged games" href="/dashboard/rankings" />
      {recentTdPlayers.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {recentTdPlayers.map((player) => <Link key={player.id} href={`/dashboard/players/${player.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-primary/40">
            <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={46} />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{player.name}</span><span className="flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-[10px] text-muted">{player.team}{player.latestTdWeek ? ` · latest TD W${player.latestTdWeek}` : ""}</span></span></span>
            <span className="font-display text-lg font-black text-primary">{player.recentTdLast3} TD{player.recentTdLast3 === 1 ? "" : "s"}</span>
          </Link>)}
        </div>
      ) : <Card><CardContent className="p-4 text-sm text-muted">Recent touchdown totals will appear when weekly player logs are available.</CardContent></Card>}
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="space-y-4">
        <SectionHeader title="Your Team" detail="Roster snapshots and alerts" href="/dashboard/leagues" />
        {teams.length ? teams.slice(0, 2).map((team) => <Card key={team.id}>
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
            <div className="min-w-0"><CardTitle className="flex flex-wrap items-center gap-2">{team.teamName}<Badge variant="outline">{team.leagueName}</Badge><Badge variant="secondary">{team.platform}</Badge></CardTitle><CardDescription className="mt-1">{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ""} · {team.players.length} rostered players</CardDescription></div>
            <Link href="/dashboard/leagues" className="shrink-0 text-xs font-bold text-primary hover:underline">View team</Link>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {team.players.slice(0, 4).map((player) => <Link key={`${team.id}-${player.name}`} href={player.playerId ? `/dashboard/players/${player.playerId}` : "/dashboard/search"} className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background/30 p-2 hover:border-primary/40">
              <PlayerAvatar name={player.name} team={player.team ?? "FA"} position={player.pos} size={42} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{player.name}</span><span className="text-[10px] text-muted">{player.pos} · {player.team ?? "FA"}</span></span>
            </Link>)}
          </CardContent>
        </Card>) : <Card><CardContent className="flex flex-col items-start gap-3 p-5"><p className="text-sm text-muted">Connect a roster to make your dashboard, news, and waiver advice team-specific.</p><Button asChild size="sm"><Link href="/dashboard/sync">Connect ESPN or Sleeper</Link></Button></CardContent></Card>}
        {rosterInjuries.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4 text-warning" />Injury watch · your roster</CardTitle></CardHeader><CardContent className="space-y-1">{rosterInjuries.map((injury) => <div key={injury.id} className="flex items-center justify-between rounded-lg px-2 py-1.5"><span className="flex items-center gap-2 text-sm"><PosBadge pos={injury.pos ?? "?"} />{injury.name}<span className="text-xs text-muted">{injury.injury}</span></span><StatusBadge status={injury.status} /></div>)}</CardContent></Card>}
      </section>

      <section className="space-y-4">
        <SectionHeader title="News for your players" detail="Roster stories first" href="/dashboard/news" />
        <Card><CardContent
          role="region"
          aria-label="News stories for your players"
          tabIndex={0}
          className="max-h-[70vh] divide-y divide-border overflow-y-auto overscroll-contain p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {news.slice(0, 4).map((item) => {
            const mentionedPlayers = teams.flatMap((team) => team.players)
              .filter((player) => item.matchingPlayers.some((name) => normalizeName(name) === normalizeName(player.name)))
              .filter((player, index, rows) => rows.findIndex((other) => normalizeName(other.name) === normalizeName(player.name)) === index);
            return <DashboardNewsCard
              key={item.id}
              item={item}
              players={mentionedPlayers}
              expanded={expandedNewsId === item.id}
              onToggle={() => setExpandedNewsId((current) => current === item.id ? null : item.id)}
            />;
          })}
          {news.length === 0 && <p className="p-5 text-sm text-muted">No news stories yet. Check back after the feed refreshes.</p>}
        </CardContent></Card>
      </section>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="space-y-4">
        <SectionHeader title="Trending" detail="Biggest recent player moves" href="/dashboard/market" />
        <div role="region" aria-label="Trending players" tabIndex={0} className="grid max-h-[28rem] gap-2 overflow-y-auto overscroll-contain pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:grid-cols-2">{trending.slice(0, 16).map((player) => <Link key={player.id} href="/dashboard/market" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-primary/40">
          <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={48} />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{player.name}</span><span className="flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-[10px] text-muted">{player.catalyst ?? "Market move"}</span></span></span>
          <span className={`flex items-center text-sm font-black ${player.changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{player.changePct >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{Math.abs(player.changePct).toFixed(1)}%</span>
        </Link>)}</div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Stats leaders" detail={`${mode === "dynasty" ? "Dynasty outlook" : scoringLabel(scoring)} · average points per game`} href="/dashboard/rankings" />
        <Card><CardContent role="region" aria-label="Stats leaders" tabIndex={0} className="max-h-[28rem] divide-y divide-border overflow-y-auto overscroll-contain p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {leaders.map((player, index) => <Link key={player.id} href={`/dashboard/players/${player.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-border/20">
            <span className="w-5 text-xs font-bold text-muted">{index + 1}</span><PlayerAvatar name={player.name} team={player.team} position={player.pos} size={38} /><PosBadge pos={player.pos} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{player.name}</span><span className="text-sm font-black tabular-nums">{points(player).toFixed(1)}<span className="ml-1 text-[9px] font-medium text-muted">PPG</span></span>
          </Link>)}
        </CardContent></Card>
      </section>
    </div>

    <section className="space-y-4">
      <SectionHeader title="Recommended trades" detail="Fair-value ideas based on native league depth and position needs" href="/dashboard/trades" />
      {recommendedTrades.length ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {recommendedTrades.map((trade) => <Card key={trade.key} className="border-cyan-400/20 bg-cyan-400/[.035]">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><CardTitle className="truncate text-base">{trade.leagueName}</CardTitle><CardDescription className="mt-1">Possible deal with {trade.otherTeamName}</CardDescription></div>
                <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-200">FAIR · {Math.abs(trade.percentDiff).toFixed(1)}%</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <TradeSide label="You give" player={trade.giving} />
              <TradeSide label="You get" player={trade.receiving} />
              <p className="border-t border-border/70 pt-3 text-xs leading-5 text-muted">{trade.reason}</p>
            </CardContent>
          </Card>)}
        </div>
      ) : (
        <Card><CardContent className="p-4 text-sm leading-6 text-muted">
          Trade ideas appear when you have a native league roster with a position surplus that matches another manager’s roster need. Sleeper and ESPN imports are read-only, so recommendations use leagues created or joined in Gridiron HQ.
        </CardContent></Card>
      )}
      <p className="text-[10px] leading-4 text-muted">These are rule-based suggestions, not trade offers. Values use the app’s positional-scarcity and injury-adjusted trade heuristic.</p>
    </section>

    <section className="space-y-4">
      <SectionHeader title="Film Study" detail="Fresh fantasy analysis and player breakdowns" href="/dashboard/fantasy-feed" />
      {videos.length ? <div className="grid gap-3 md:grid-cols-3">{videos.map((video) => <a key={video.video_id} href={video.watch_url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary/40">
        <div className="relative aspect-video overflow-hidden bg-background"><Image src={video.thumbnail_url} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-300 group-hover:scale-105" /><span className="absolute bottom-2 left-2 rounded-full bg-black/80 px-2 py-1 text-[9px] font-bold text-white">FILM ROOM</span></div>
        <div className="p-3"><p className="line-clamp-2 text-sm font-bold leading-5">{video.title}</p><p className="mt-1 text-[10px] text-muted">{video.channel_title} · {new Date(video.published_at).toLocaleDateString()}</p></div>
      </a>)}</div> : <Card><CardContent className="flex items-center gap-3 p-5 text-sm text-muted"><BookOpen className="h-5 w-5" /><span>No film videos are loaded yet. Apply the Fantasy Feed migration and run its refresh workflow; <Link href="/dashboard/fantasy-feed" className="font-bold text-primary hover:underline">see setup</Link>.</span></CardContent></Card>}
    </section>

    <section className="space-y-4">
      <SectionHeader title="From The Huddle" detail="Latest manager conversations" href="/dashboard/community" />
      {huddlePosts.length ? <div className="grid gap-3 md:grid-cols-2">{huddlePosts.slice(0, 4).map((post) => <Link key={post.id} href="/dashboard/community" className="rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/40"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted"><MessageCircle className="h-3.5 w-3.5" />{new Date(post.created_at).toLocaleDateString()}</div><p className="line-clamp-3 text-sm leading-6">{post.body}</p></Link>)}</div> : <Card><CardContent className="flex items-center justify-between gap-4 p-5"><span className="text-sm text-muted">The Huddle is quiet. Start a conversation with other managers.</span><Button asChild variant="secondary" size="sm"><Link href="/dashboard/community">Open Huddle</Link></Button></CardContent></Card>}
    </section>

    <section className="grid gap-3 sm:grid-cols-2">
      <QuickLink href="/dashboard/waiver" title="Waiver wire" detail={`${waiver.length} targets · tailored to your roster`} />
      <QuickLink href="/dashboard/start-sit" title="Start / Sit" detail="Compare players on your team first" />
    </section>
  </div>;
}

function scoringLabel(scoring: string) {
  return scoring === "ppr" ? "PPR" : scoring === "standard" ? "Standard" : "Half-PPR";
}

function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function safeStoryUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function DashboardNewsCard({
  item, players, expanded, onToggle,
}: {
  item: PersonalizedNews;
  players: OverviewTeam["players"];
  expanded: boolean;
  onToggle: () => void;
}) {
  const leadPlayer = players[0];
  const [teamPrimary, teamSecondary] = teamColors(leadPlayer?.team);
  const storyHref = safeStoryUrl(item.article_url);
  const fallbackHref = safeStoryUrl(item.source_url);
  const playerNames = players.slice(0, 2).map((player) => player.name);
  const bodyColor = `color-mix(in srgb, ${teamSecondary} 62%, white)`;
  const panelId = `news-story-${item.id}`;

  return (
    <article className="overflow-hidden rounded-xl border-b border-border last:border-b-0" style={{ borderColor: `${teamPrimary}35` }}>
      {item.image_url && <div className="relative aspect-[16/7] overflow-hidden">
        <Image src={item.image_url} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 560px" className="object-cover" />
      </div>}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="group flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
        style={{ outlineColor: teamPrimary }}
      >
        {leadPlayer ? (
          <PlayerAvatar name={leadPlayer.name} team={leadPlayer.team ?? "FA"} position={leadPlayer.pos} size={44} />
        ) : item.image_url ? (
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl">
            <Image src={item.image_url} alt="" fill unoptimized sizes="44px" className="object-cover" />
          </span>
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${teamPrimary}22`, color: teamPrimary }}>
            <Newspaper className="h-5 w-5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: teamPrimary }}>
              {item.onTeam ? `Your team${playerNames.length ? ` · ${playerNames.join(", ")}` : ""}` : item.source ?? "Fantasy news"}
            </span>
            <time className="text-[10px] text-muted">{item.item_date ?? "Latest"}</time>
          </span>
          <span className="block font-display text-base font-bold leading-5" style={{ color: teamPrimary }}>{item.headline}</span>
          {item.body && <span className="mt-1 block line-clamp-2 text-xs leading-5" style={{ color: bodyColor }}>{item.body}</span>}
        </span>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div id={panelId} className="space-y-3 px-3 pb-4 pl-[4.5rem]">
          {players.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {players.slice(0, 3).map((player) => <Link key={`${player.name}-${player.team}`} href={player.playerId ? `/dashboard/players/${player.playerId}` : "/dashboard/search"} className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold hover:brightness-125" style={{ borderColor: `${teamColors(player.team)[0]}66`, color: teamColors(player.team)[0] }}>
                <PlayerAvatar name={player.name} team={player.team ?? "FA"} position={player.pos} size={24} />
                {player.name} · {player.pos}
              </Link>)}
            </div>
          )}
          {item.body && <p className="max-w-2xl whitespace-pre-line text-sm leading-6" style={{ color: bodyColor }}>{item.body}</p>}
          {(storyHref || fallbackHref) && (
            <a href={storyHref ?? fallbackHref!} target="_blank" rel="noopener noreferrer" className="inline-flex text-xs font-bold hover:underline" style={{ color: teamPrimary }}>
              Read full story <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </article>
  );
}

function TradeSide({ label, player }: { label: string; player: Pick<OverviewPlayer, "name" | "team" | "pos" | "avg_pts"> }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/40 p-3">
      <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={40} />
      <span className="min-w-0 flex-1"><span className="block text-[9px] font-black uppercase tracking-wider text-muted">{label}</span><span className="mt-0.5 block truncate text-sm font-bold">{player.name}</span></span>
      <span className="flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-xs font-black text-cyan-200">{player.avg_pts.toFixed(1)} PPG</span></span>
    </div>
  );
}

function SectionHeader({ title, detail, href }: { title: string; detail: string; href: string }) {
  return <div className="flex items-end justify-between gap-3"><div><h2 className="font-display text-xl font-black uppercase tracking-wide">{title}</h2><p className="text-xs text-muted">{detail}</p></div><Link href={href} className="shrink-0 text-xs font-bold text-primary hover:underline">See all <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>;
}

function StatTile({ label, value, detail, icon, color }: { label: string; value: string; detail: string; icon: React.ReactNode; color: string }) {
  return <Card className="relative overflow-hidden bg-surface/80" style={{ borderColor: `${color}66`, backgroundImage: `linear-gradient(135deg, ${color}19, transparent 68%)` }}>
    <span aria-hidden="true" className="absolute -right-7 -top-9 h-24 w-24 rounded-full blur-2xl" style={{ backgroundColor: `${color}30` }} />
    <CardContent className="relative p-4">
      <div className="flex items-center justify-between gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-right text-[9px] font-black uppercase tracking-wider text-muted">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-black" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[10px] text-muted">{detail}</p>
    </CardContent>
  </Card>;
}

function QuickLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return <Link href={href} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/40"><span><span className="block font-bold">{title}</span><span className="mt-1 block text-xs text-muted">{detail}</span></span><ArrowRight className="h-4 w-4 text-primary" /></Link>;
}
