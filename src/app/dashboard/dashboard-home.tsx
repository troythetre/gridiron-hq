"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, MessageCircle, Newspaper, Search, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import type { InjuryRow, NewsItemRow, FantasyVideoRow, WaiverPickRow, PlayerMarketRow } from "@/lib/types";
import { PlayerAvatar } from "@/components/player-avatar";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFantasyPreferences, pointsForFormat } from "@/components/fantasy-preferences";
import type { OverviewPlayer, OverviewPost, OverviewTeam } from "./page";

type PersonalizedNews = NewsItemRow & { onTeam: boolean; matchingPlayers: string[] };

export function DashboardHome({
  players, injuries, waiver, news, videos, teams, trending, huddlePosts,
}: {
  players: OverviewPlayer[]; injuries: InjuryRow[]; waiver: WaiverPickRow[]; news: PersonalizedNews[];
  videos: FantasyVideoRow[]; teams: OverviewTeam[]; trending: PlayerMarketRow[]; huddlePosts: OverviewPost[];
}) {
  const { scoring, mode } = useFantasyPreferences();
  const points = (player: OverviewPlayer) => pointsForFormat(player.avg_pts, player.receptionsPerGame, scoring);
  const leaders = [...players].sort((a, b) => {
    if (mode === "dynasty" && (a.yearsExperience ?? 99) !== (b.yearsExperience ?? 99)) return (a.yearsExperience ?? 99) - (b.yearsExperience ?? 99);
    return points(b) - points(a);
  }).slice(0, 5);
  const rosterNames = new Set(teams.flatMap((team) => team.players.map((player) => player.name.toLowerCase())));
  const rosterInjuries = injuries.filter((injury) => rosterNames.has(injury.name.toLowerCase())).slice(0, 4);
  const onTeamNews = news.filter((item) => item.onTeam);

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
      <StatTile label="Players tracked" value={players.length.toLocaleString()} detail={`${scoringLabel(scoring)} rankings`} icon={<Sparkles className="h-4 w-4" />} />
      <StatTile label="Your teams" value={teams.length.toString()} detail={teams.length ? "ESPN + Sleeper" : "Connect a roster"} icon={<ShieldAlert className="h-4 w-4" />} />
      <StatTile label="Roster news" value={onTeamNews.length.toString()} detail="Stories tied to your players" icon={<Newspaper className="h-4 w-4" />} />
      <StatTile label="Trending" value={trending.filter((player) => player.changePct > 0).length.toString()} detail="Players gaining momentum" icon={<TrendingUp className="h-4 w-4" />} />
    </div>

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
        <Card><CardContent className="divide-y divide-border p-2">
          {news.slice(0, 4).map((item) => <Link key={item.id} href="/dashboard/news" className="block rounded-xl p-3 transition hover:bg-border/20">
            <div className="mb-1 flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-wider text-primary">{item.onTeam ? `Your team${item.matchingPlayers.length ? ` · ${item.matchingPlayers.slice(0, 2).join(", ")}` : ""}` : item.source ?? "Fantasy news"}</span><span className="text-[10px] text-muted">{item.item_date ?? "Latest"}</span></div>
            <p className="text-sm font-semibold leading-5">{item.headline}</p>
            {item.body && <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{item.body}</p>}
          </Link>)}
          {news.length === 0 && <p className="p-5 text-sm text-muted">No news stories yet. Check back after the feed refreshes.</p>}
        </CardContent></Card>
      </section>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="space-y-4">
        <SectionHeader title="Trending" detail="Biggest recent player moves" href="/dashboard/market" />
        <div className="grid gap-2 sm:grid-cols-2">{trending.slice(0, 4).map((player) => <Link key={player.id} href="/dashboard/market" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition hover:border-primary/40">
          <PlayerAvatar name={player.name} team={player.team} position={player.pos} size={48} />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{player.name}</span><span className="flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-[10px] text-muted">{player.catalyst ?? "Market move"}</span></span></span>
          <span className={`flex items-center text-sm font-black ${player.changePct >= 0 ? "text-success" : "text-danger"}`}>{player.changePct >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{Math.abs(player.changePct).toFixed(1)}%</span>
        </Link>)}</div>
      </section>

      <section className="space-y-4">
        <SectionHeader title="Stats leaders" detail={`${mode === "dynasty" ? "Dynasty outlook" : scoringLabel(scoring)} · average points per game`} href="/dashboard/rankings" />
        <Card><CardContent className="divide-y divide-border p-2">
          {leaders.map((player, index) => <Link key={player.id} href={`/dashboard/players/${player.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-border/20">
            <span className="w-5 text-xs font-bold text-muted">{index + 1}</span><PlayerAvatar name={player.name} team={player.team} position={player.pos} size={38} /><PosBadge pos={player.pos} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{player.name}</span><span className="text-sm font-black tabular-nums">{points(player).toFixed(1)}<span className="ml-1 text-[9px] font-medium text-muted">PPG</span></span>
          </Link>)}
        </CardContent></Card>
      </section>
    </div>

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

function SectionHeader({ title, detail, href }: { title: string; detail: string; href: string }) {
  return <div className="flex items-end justify-between gap-3"><div><h2 className="font-display text-xl font-black uppercase tracking-wide">{title}</h2><p className="text-xs text-muted">{detail}</p></div><Link href={href} className="shrink-0 text-xs font-bold text-primary hover:underline">See all <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link></div>;
}

function StatTile({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <Card><CardContent className="p-4"><div className="flex items-center justify-between text-primary">{icon}<span className="text-[9px] font-black uppercase tracking-wider text-muted">{label}</span></div><p className="mt-2 font-display text-2xl font-black">{value}</p><p className="mt-0.5 text-[10px] text-muted">{detail}</p></CardContent></Card>;
}

function QuickLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return <Link href={href} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-primary/40"><span><span className="block font-bold">{title}</span><span className="mt-1 block text-xs text-muted">{detail}</span></span><ArrowRight className="h-4 w-4 text-primary" /></Link>;
}
