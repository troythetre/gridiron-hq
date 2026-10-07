"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft, ArrowUpRight, BarChart3, CalendarDays, Check, ChevronRight, CircleDot,
  Clipboard, GraduationCap, HeartPulse, Info, Newspaper, Sparkles, TrendingUp, UserRound,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PosBadge } from "@/components/pos-badge";
import { PlayerAvatar } from "@/components/player-avatar";
import type { InjuryRow, NewsItemRow, PlayerRow } from "@/lib/types";
import type { PlayerProfileData, PlayerWeekStat } from "@/lib/player-profile-types";
import { PLAYER_PHOTOS, teamColors } from "@/lib/player-visuals";
import { cn } from "@/lib/utils";

type ProfileTab = "stats" | "bio" | "trends" | "news" | "more";

const PROFILE_TABS: { id: ProfileTab; label: string; icon: typeof BarChart3 }[] = [
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "bio", label: "Bio", icon: UserRound },
  { id: "trends", label: "Trends", icon: TrendingUp },
  { id: "news", label: "News", icon: Newspaper },
  { id: "more", label: "More", icon: Sparkles },
];

export function PlayerProfile({
  player,
  profile,
  players,
  news,
  injury,
}: {
  player: PlayerRow;
  profile: PlayerProfileData | null;
  players: PlayerRow[];
  news: NewsItemRow[];
  injury: InjuryRow | null;
}) {
  const [tab, setTab] = useState<ProfileTab>("stats");
  const [trendSeason, setTrendSeason] = useState(profile?.season ?? new Date().getFullYear());
  const [copied, setCopied] = useState(false);
  const weeks = useMemo(() => {
    if (profile?.weeks?.length) return profile.weeks;
    return [
      ...(player.wk1_pts == null ? [] : [{ week: 1, fantasyPoints: player.wk1_pts } as PlayerWeekStat]),
      ...(player.wk2_pts == null ? [] : [{ week: 2, fantasyPoints: player.wk2_pts } as PlayerWeekStat]),
    ];
  }, [profile, player.wk1_pts, player.wk2_pts]);

  const currentPoints = sum(weeks, "fantasyPoints");
  const pointsTotal = weeks.length > 0 ? currentPoints : player.total_pts;
  const games = weeks.length > 0 ? weeks.length : player.games;
  const pointsPerGame = games > 0 ? pointsTotal / games : player.avg_pts;
  const positionPeers = players.filter((candidate) => candidate.pos === player.pos && candidate.id !== player.id);
  const peerAverage = positionPeers.length
    ? positionPeers.reduce((total, candidate) => total + candidate.avg_pts, 0) / positionPeers.length
    : null;
  const totalYards = sum(weeks, "passingYards") + sum(weeks, "rushingYards") + sum(weeks, "receivingYards");
  const totalTds = sum(weeks, "passingTds") + sum(weeks, "rushingTds") + sum(weeks, "receivingTds");
  const targets = sum(weeks, "targets");
  const carries = sum(weeks, "carries");
  const trendSeasons = (profile?.history?.length
    ? profile.history
    : [{ season: profile?.season ?? new Date().getFullYear(), weeks }]).slice(-5);
  const selectedTrend = trendSeasons.find((season) => season.season === trendSeason) ?? trendSeasons.at(-1)!;
  const [teamPrimary, teamSecondary] = teamColors();
  const photo = PLAYER_PHOTOS[player.name] ?? profile?.headshotUrl ?? null;
  const heroStyle: CSSProperties = {
    "--team-color": teamPrimary,
    "--team-accent": teamSecondary,
    ...(photo
      ? {
          backgroundImage: `linear-gradient(90deg, rgba(6,10,16,.98) 0%, rgba(6,10,16,.86) 40%, rgba(6,10,16,.38) 100%), linear-gradient(0deg, rgba(6,10,16,.92), transparent 65%), url("${photo}")`,
          backgroundPosition: "center, center, 65% 35%",
        }
      : {}),
  } as CSSProperties;

  const shareProfile = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/rankings"
          className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/80 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
          Player board
        </Link>
        <button
          onClick={shareProfile}
          className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/80 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary"
          type="button"
        >
          {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
          {copied ? "Copied" : "Share profile"}
        </button>
      </div>

      <section
        className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(ellipse_at_70%_0%,color-mix(in_srgb,var(--team-color)_45%,transparent),transparent_48%),linear-gradient(130deg,#101820,#090b10_58%,#17130a)] bg-cover shadow-[0_30px_100px_-45px_color-mix(in_srgb,var(--team-color)_70%,transparent)]"
        style={heroStyle}
      >
        <div className="absolute inset-0 -z-10 opacity-[.11] [background-image:linear-gradient(rgba(255,255,255,.3)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.3)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(90deg,black,transparent_80%)]" />
        <div className="absolute right-[-5rem] top-[-7rem] -z-10 h-80 w-80 rounded-full border-[1px] border-white/10" />
        <div className="absolute right-[-1rem] top-[-3rem] -z-10 h-64 w-64 rounded-full border-[1px] border-white/10" />
        <div className="grid min-h-[360px] gap-6 p-5 sm:min-h-[420px] sm:grid-cols-[1fr_auto] sm:items-end sm:p-9 lg:p-12">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:gap-7">
            <div className="relative shrink-0 rounded-[2rem] border border-white/20 bg-black/30 p-2 shadow-2xl backdrop-blur-sm">
              <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle,color-mix(in_srgb,var(--team-accent)_35%,transparent),transparent_70%)]" />
              <PlayerAvatar
                name={player.name}
                team={player.team}
                position={player.pos}
                number={profile?.jerseyNumber}
                size={164}
                className="relative drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] sm:h-[190px] sm:w-[190px]"
              />
              <div className="absolute -bottom-2 -right-2 flex h-10 min-w-10 items-center justify-center rounded-full border-4 border-[#101820] bg-primary px-2 text-xs font-black text-primary-foreground">
                {player.pos}
              </div>
            </div>
            <div className="pb-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-primary">
                  <CircleDot className="h-3 w-3" /> Player spotlight
                </span>
                <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-white/70">
                  {profile?.season ?? new Date().getFullYear()} Season
                </span>
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-[.94] tracking-tight text-white drop-shadow sm:text-6xl lg:text-7xl">
                {player.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <PosBadge pos={player.pos} />
                <span className="rounded-md border border-white/15 bg-black/35 px-2.5 py-1 text-xs font-black tracking-[.12em] text-white">
                  {profile?.jerseyNumber ? `#${profile.jerseyNumber}` : `#${(player.overall_rank ?? 0).toString().padStart(2, "0")}`}
                </span>
                <span className="text-sm font-bold uppercase tracking-[.2em] text-white/75">{player.team}</span>
                {profile?.status && profile.status !== "ACT" && (
                  <span className="rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-warning">
                    {profile.status}
                  </span>
                )}
                {injury && <span className="rounded-full border border-danger/40 bg-danger/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-danger">{injury.status} · {injury.injury}</span>}
              </div>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                {profile?.college ? `${profile.college} alum` : `${player.pos} · ${player.team}`} · {profile?.yearsExperience != null ? `${profile.yearsExperience} seasons in the league` : "Player profile"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:w-[280px] sm:grid-cols-1 sm:gap-3">
            <HeroStat label="Half-PPR PPG" value={pointsPerGame.toFixed(1)} hint={`${games} games`} />
            <HeroStat label="Season points" value={pointsTotal.toFixed(1)} hint={`Rank #${player.overall_rank ?? "—"}`} />
            <HeroStat label="Position rank" value={`#${player.pos_rank ?? "—"}`} hint={player.pos} />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 bg-black/25 px-5 py-3 text-[10px] font-bold uppercase tracking-[.18em] text-white/50 sm:px-9">
          <span>Gridiron HQ · Player intelligence</span>
          <span>Updated through week {Math.max(0, ...weeks.map((week) => week.week)) || "—"}</span>
        </div>
      </section>

      <Tabs value={tab} onValueChange={(value) => setTab(value as ProfileTab)}>
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border-white/10 bg-surface/85 p-1.5 sm:w-fit">
          {PROFILE_TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="h-10 gap-2 rounded-xl px-4 text-xs uppercase tracking-[.13em] sm:px-5"
            >
              <Icon className="h-4 w-4" /> {label}
              {id === "news" && news.length > 0 && <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black text-black">{news.length}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "stats" && (
        <div className="space-y-5">
          <SectionHeading eyebrow="Production dashboard" title="The numbers that move your lineup" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Half-PPR points" value={pointsTotal.toFixed(1)} icon={<Sparkles />} accent />
            <MetricCard label="Points per game" value={pointsPerGame.toFixed(1)} icon={<TrendingUp />} />
            <MetricCard label="Total yards" value={totalYards.toLocaleString()} icon={<BarChart3 />} />
            <MetricCard label="Touchdowns" value={totalTds.toString()} icon={<CircleDot />} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card className="overflow-hidden border-white/10 bg-surface/75">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border/70 p-5">
                  <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-primary">Game log</p><h2 className="mt-1 text-xl font-bold">Week by week</h2></div>
                  <span className="rounded-full border border-border bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">{profile?.season ?? "Current"}</span>
                </div>
                {weeks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-xs">
                      <thead className="bg-black/15 text-[9px] uppercase tracking-[.16em] text-muted">
                        <tr><th className="px-5 py-3">Week</th><th className="px-3 py-3 text-right">Fantasy</th><th className="px-3 py-3 text-right">Pass Yds</th><th className="px-3 py-3 text-right">Rush Yds</th><th className="px-3 py-3 text-right">Targets</th><th className="px-5 py-3 text-right">Rec Yds</th></tr>
                      </thead>
                      <tbody>{weeks.map((week) => (
                        <tr key={week.week} className="border-t border-border/60 transition hover:bg-white/[.025]">
                          <td className="px-5 py-3.5 font-bold">WK {week.week.toString().padStart(2, "0")}</td>
                          <td className="px-3 py-3.5 text-right font-black text-primary">{week.fantasyPoints?.toFixed(1) ?? "—"}</td>
                          <td className="px-3 py-3.5 text-right text-muted">{week.passingYards ?? "—"}</td>
                          <td className="px-3 py-3.5 text-right text-muted">{week.rushingYards ?? "—"}</td>
                          <td className="px-3 py-3.5 text-right text-muted">{week.targets ?? "—"}</td>
                          <td className="px-5 py-3.5 text-right text-muted">{week.receivingYards ?? "—"}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <EmptyState message="Weekly game logs will appear as stats are added." />}
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-surface/75">
              <CardContent className="p-5">
                <SectionHeading eyebrow="Usage profile" title="Touches & targets" compact />
                <TrendChart weeks={weeks} valueFor={(week) => (week.carries ?? 0) + (week.targets ?? 0)} unit="opps" tone="muted" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniStat label="Carries" value={carries.toString()} />
                  <MiniStat label="Targets" value={targets.toString()} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "bio" && <BioPanel player={player} profile={profile} />}

      {tab === "trends" && (
        <div className="space-y-5">
          <SectionHeading eyebrow="Film room / trend lab" title="How the production is moving" />
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/60 p-3" aria-label="Trend season filter">
            <span className="mr-1 text-[10px] font-black uppercase tracking-wider text-muted">Season</span>
            {trendSeasons.map(({ season }) => <button key={season} type="button" onClick={() => setTrendSeason(season)} aria-pressed={selectedTrend.season === season} className={cn("rounded-full border px-3 py-1.5 text-xs font-bold transition", selectedTrend.season === season ? "border-primary bg-primary/15 text-primary" : "border-border text-muted hover:text-foreground")}>{season}</button>)}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="border-white/10 bg-surface/75"><CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between"><SectionHeading eyebrow={`${selectedTrend.season} fantasy output`} title="Weekly half-PPR" compact /><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">PTS</span></div>
              <TrendChart weeks={selectedTrend.weeks} valueFor={(week) => week.fantasyPoints ?? 0} unit="pts" tone="bright" tall />
            </CardContent></Card>
            <Card className="border-white/10 bg-surface/75"><CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between"><SectionHeading eyebrow={`${selectedTrend.season} opportunity`} title="Yards from scrimmage" compact /><span className="rounded-full bg-sky-400/10 px-2.5 py-1 text-[10px] font-black text-sky-300">YDS</span></div>
              <TrendChart weeks={selectedTrend.weeks} valueFor={(week) => (week.rushingYards ?? 0) + (week.receivingYards ?? 0)} unit="yds" tone="muted" tall />
            </CardContent></Card>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <InsightCard label="Recent points" value={trendText(selectedTrend.weeks)} detail="Last game compared with the prior game" icon={<TrendingUp />} />
            <InsightCard label="Target share" value={formatPercent(mean(selectedTrend.weeks.map((week) => week.targetShare)))} detail="Average weekly share of team targets" icon={<CircleDot />} />
            <InsightCard label="Air-yards share" value={formatPercent(mean(selectedTrend.weeks.map((week) => week.airYardsShare)))} detail="Average weekly share of team air yards" icon={<ArrowUpRight />} />
          </div>
          <p className="rounded-xl border border-border/70 bg-surface/50 px-4 py-3 text-xs leading-5 text-muted">
            Trend charts describe the games already played. They are not a projection; use matchup, injury, and role context before making a start/sit call.
          </p>
        </div>
      )}

      {tab === "news" && (
        <div className="space-y-5">
          <SectionHeading eyebrow="Around the league" title={`${player.name} news desk`} />
          {news.length > 0 ? <div className="grid gap-3 lg:grid-cols-2">{news.map((item) => <NewsCard key={item.id} item={item} />)}</div> : (
            <Card className="border-white/10 bg-surface/75"><CardContent className="py-14"><EmptyState message={`No player-specific news is linked to ${player.name} yet.`} /><p className="mt-3 text-center text-xs text-muted">League-wide updates are in <Link href="/dashboard/news" className="font-bold text-primary hover:underline">Fantasy News</Link>.</p></CardContent></Card>
          )}
        </div>
      )}

      {tab === "more" && (
        <div className="space-y-5">
          <SectionHeading eyebrow="Extra context" title="Usage, value & quick actions" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-white/10 bg-surface/75"><CardContent className="p-5">
              <SectionHeading eyebrow="Advanced usage" title="Opportunity signals" compact />
              <DataRow label="Targets" value={targets.toString()} /><DataRow label="Avg. target share" value={formatPercent(mean(weeks.map((week) => week.targetShare)))} />
              <DataRow label="Avg. air-yards share" value={formatPercent(mean(weeks.map((week) => week.airYardsShare)))} /><DataRow label="WOPR" value={formatDecimal(mean(weeks.map((week) => week.wopr)))} />
              <DataRow label="RACR" value={formatDecimal(mean(weeks.map((week) => week.racr)))} last />
              <p className="mt-4 text-[10px] leading-4 text-muted">WOPR and RACR are receiver usage/efficiency metrics. Missing values are left blank.</p>
            </CardContent></Card>
            <Card className="border-white/10 bg-surface/75"><CardContent className="p-5">
              <SectionHeading eyebrow="Fantasy value" title="Rank snapshot" compact />
              <div className="my-5 flex items-end gap-3"><span className="font-display text-6xl font-black leading-none text-primary">#{player.overall_rank ?? "—"}</span><span className="pb-1 text-xs uppercase tracking-wider text-muted">overall</span></div>
              <DataRow label="Position" value={player.pos} /><DataRow label="Position rank" value={`#${player.pos_rank ?? "—"}`} /><DataRow label="Points per game" value={pointsPerGame.toFixed(1)} /><DataRow label="Position peer average" value={peerAverage == null ? "—" : peerAverage.toFixed(1)} last />
              {injury && <div className="mt-4 rounded-xl border border-danger/25 bg-danger/[.06] p-3"><p className="text-[9px] font-black uppercase tracking-[.15em] text-danger">Injury report · {injury.status}</p><p className="mt-1 text-xs font-semibold">{injury.injury}</p>{injury.note && <p className="mt-1 text-[10px] leading-4 text-muted">{injury.note}</p>}</div>}
            </CardContent></Card>
            <Card className="border-white/10 bg-surface/75"><CardContent className="p-5">
              <SectionHeading eyebrow="Get back in the game" title="Quick links" compact />
              <QuickLink href="/dashboard/start-sit" title="Start / sit tool" detail="Compare against another player" icon={<CircleDot />} />
              <QuickLink href="/dashboard/rankings" title="Full player board" detail="Browse every ranked player" icon={<BarChart3 />} />
              <QuickLink href="/dashboard/waiver" title="Waiver wire" detail="Find your next breakout" icon={<Sparkles />} />
              <QuickLink href="/dashboard/news" title="Fantasy news" detail="See the latest league updates" icon={<Newspaper />} last />
            </CardContent></Card>
          </div>
          <Card className="border-primary/20 bg-primary/[.04]"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-primary">Player comparison</p><p className="mt-1 text-sm text-muted">See how {player.name} stacks up against the rest of the field.</p></div>
            <Link href={player.id > 0 ? `/dashboard/compare?player=${player.id}` : "/dashboard/compare"} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110">Compare players <ChevronRight className="h-4 w-4" /></Link>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}

function sum(weeks: PlayerWeekStat[], key: keyof PlayerWeekStat) {
  return weeks.reduce((total, week) => total + (typeof week[key] === "number" ? week[key] as number : 0), 0);
}

function mean(values: (number | null)[]) {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return present.length ? present.reduce((total, value) => total + value, 0) / present.length : null;
}

function formatPercent(value: number | null) {
  return value == null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatDecimal(value: number | null) {
  return value == null ? "—" : value.toFixed(2);
}

function trendText(weeks: PlayerWeekStat[]) {
  const played = weeks.filter((week) => typeof week.fantasyPoints === "number");
  if (played.length < 2) return "Building sample";
  const delta = (played.at(-1)?.fantasyPoints ?? 0) - (played.at(-2)?.fantasyPoints ?? 0);
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts`;
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
    <p className="truncate text-[8px] font-black uppercase tracking-[.16em] text-white/55 sm:text-[9px]">{label}</p>
    <div className="mt-0.5 flex items-baseline justify-between gap-1 sm:mt-1"><span className="font-display text-2xl font-black leading-none text-white sm:text-3xl">{value}</span><span className="hidden text-[9px] font-bold text-primary sm:block">{hint}</span></div>
  </div>;
}

function SectionHeading({ eyebrow, title, compact = false }: { eyebrow: string; title: string; compact?: boolean }) {
  return <div className={cn(!compact && "mb-1")}>
    <p className="text-[9px] font-black uppercase tracking-[.2em] text-primary">{eyebrow}</p>
    <h2 className={cn("mt-1 font-bold", compact ? "text-lg" : "text-2xl sm:text-3xl")}>{title}</h2>
  </div>;
}

function MetricCard({ label, value, icon, accent = false }: { label: string; value: string; icon: ReactNode; accent?: boolean }) {
  return <Card className={cn("border-white/10 bg-surface/75", accent && "border-primary/25 bg-primary/[.06]")}><CardContent className="p-4 sm:p-5">
    <div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.14em] text-muted">{label}</span><span className={cn("text-muted", accent && "text-primary")}>{icon}</span></div>
    <p className={cn("mt-3 font-display text-3xl font-black sm:text-4xl", accent && "text-primary")}>{value}</p>
  </CardContent></Card>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/70 bg-black/15 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-muted">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p></div>;
}

function TrendChart({ weeks, valueFor, unit, tone, tall = false }: {
  weeks: PlayerWeekStat[];
  valueFor: (week: PlayerWeekStat) => number;
  unit: string;
  tone: "bright" | "muted";
  tall?: boolean;
}) {
  const values = weeks.map((week) => Math.max(0, valueFor(week)));
  if (weeks.length === 0) return <div className="flex h-44 items-center justify-center text-xs text-muted">Weekly data not available.</div>;
  const maxValue = Math.max(1, ...values);
  const chartHeight = tall ? 176 : 132;
  const chartWidth = Math.max(360, weeks.length * 76);
  const baseY = chartHeight - 24;
  const startX = 30;
  const step = (chartWidth - 60) / weeks.length;
  const color = tone === "bright" ? "#f5f5f5" : "#737373";
  const points = values.map((value, i) => `${startX + step * i + step / 2},${baseY - (value / maxValue) * (chartHeight - 55)}`).join(" ");

  return <div className="mt-4 overflow-x-auto">
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-auto min-w-full overflow-visible" role="img" aria-label={`Weekly ${unit} trend`}>
      {[0, .5, 1].map((fraction) => {
        const y = baseY - fraction * (chartHeight - 55);
        return <g key={fraction}><line x1="22" x2={chartWidth - 12} y1={y} y2={y} stroke="rgba(255,255,255,.09)" strokeDasharray="3 5" /><text x="0" y={y + 3} fill="rgba(255,255,255,.35)" fontSize="9">{Math.round(maxValue * fraction)}</text></g>;
      })}
      <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity={tone === "bright" ? ".72" : ".55"} />
      {weeks.map((week, index) => {
        const value = values[index];
        const x = startX + step * index + step / 2;
        const y = baseY - (value / maxValue) * (chartHeight - 55);
        return <g key={week.week}>
          <line x1={x} x2={x} y1={y} y2={baseY} stroke={color} strokeOpacity=".1" strokeWidth={Math.min(34, step * .48)} />
          <circle cx={x} cy={y} r="5" fill="#0a0a0a" stroke={color} strokeWidth="3" />
          <text x={x} y={y - 12} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">{value.toFixed(value < 10 ? 1 : 0)}</text>
          <text x={x} y={chartHeight - 5} textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="9">W{week.week}</text>
        </g>;
      })}
    </svg>
  </div>;
}

function BioPanel({ player, profile }: { player: PlayerRow; profile: PlayerProfileData | null }) {
  const age = profile?.birthDate ? calculateAge(profile.birthDate) : null;
  const height = profile?.height ? `${Math.floor(profile.height / 12)}′${profile.height % 12}″` : null;
  const draft = profile?.draftYear
    ? `${profile.draftYear} · Round ${profile.draftRound ?? "—"} · Pick ${profile.draftPick ?? "—"}`
    : profile?.rookieSeason ? `Undrafted · Rookie season ${profile.rookieSeason}` : null;

  return <div className="space-y-5">
    <SectionHeading eyebrow="Player dossier" title="The person behind the points" />
    <div className="grid gap-5 lg:grid-cols-[.9fr_1.3fr]">
      <Card className="overflow-hidden border-white/10 bg-surface/75">
        <CardContent className="relative flex min-h-[250px] items-end overflow-hidden p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_40%_0%,rgba(255,212,0,.2),transparent_55%),linear-gradient(145deg,#17202a,#090b10)]" />
          <div className="absolute -right-2 -top-4 opacity-45"><PlayerAvatar name={player.name} team={player.team} position={player.pos} number={profile?.jerseyNumber} size={230} /></div>
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-primary">{player.team} · {player.pos}</p>
            <h2 className="mt-2 max-w-sm text-3xl font-black leading-tight">{player.name}</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted">{profile?.college ? `College: ${profile.college}.` : "College details are not available in the current player file."} {profile?.yearsExperience != null ? `${profile.yearsExperience} NFL seasons.` : ""}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-surface/75"><CardContent className="p-5 sm:p-7">
        <SectionHeading eyebrow="Player file" title="Bio & background" compact />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <BioFact icon={<CalendarDays />} label="Age" value={age == null ? "—" : `${age}`} suffix={age == null ? undefined : "years"} />
          <BioFact icon={<HeartPulse />} label="Height / weight" value={height ?? "—"} suffix={profile?.weight ? `${profile.weight} lb` : undefined} />
          <BioFact icon={<GraduationCap />} label="College" value={profile?.college ?? "—"} />
          <BioFact icon={<CalendarDays />} label="Experience" value={profile?.yearsExperience == null ? "—" : `${profile.yearsExperience}`} suffix="seasons" />
          <BioFact icon={<CircleDot />} label="Draft" value={draft ?? "—"} />
          <BioFact icon={<Info />} label="Current team" value={player.team} />
        </div>
        <p className="mt-5 border-t border-border/70 pt-4 text-[10px] leading-4 text-muted">Biographical fields are sourced from nflverse player records. The app’s fantasy ranking and scoring format may differ from other platforms.</p>
      </CardContent></Card>
    </div>
  </div>;
}

function calculateAge(birthDate: string) {
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

function BioFact({ icon, label, value, suffix }: { icon: ReactNode; label: string; value: string; suffix?: string }) {
  return <div className="min-h-[92px] rounded-xl border border-border/70 bg-black/15 p-3">
    <div className="flex items-center gap-1.5 text-muted"><span className="text-primary">{icon}</span><span className="text-[8px] font-black uppercase tracking-wider">{label}</span></div>
    <p className="mt-3 truncate text-sm font-bold" title={value}>{value}</p>{suffix && <p className="mt-0.5 text-[10px] text-muted">{suffix}</p>}
  </div>;
}

function InsightCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: ReactNode }) {
  return <Card className="border-white/10 bg-surface/75"><CardContent className="p-4">
    <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.16em] text-muted">{label}</p><span className="text-primary">{icon}</span></div>
    <p className="mt-3 font-display text-3xl font-black">{value}</p><p className="mt-1 text-[10px] leading-4 text-muted">{detail}</p>
  </CardContent></Card>;
}

function NewsCard({ item }: { item: NewsItemRow }) {
  return <Card className="group border-white/10 bg-surface/75 transition hover:border-primary/30">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-4"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary">Player update</span><span className="text-[10px] text-muted">{item.item_date ?? "Recent"}</span></div>
      <h3 className="mt-4 text-lg font-bold leading-snug transition group-hover:text-primary">{item.article_url ? <a href={item.article_url} target="_blank" rel="noreferrer">{item.headline}<ArrowUpRight className="ml-1 inline h-4 w-4" /></a> : item.headline}</h3>
      {item.body && <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted">{item.body}</p>}
      {item.source && <p className="mt-4 border-t border-border/70 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted">Source · {item.article_url ? item.source : item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{item.source}</a> : item.source}</p>}
    </CardContent>
  </Card>;
}

function DataRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div className={cn("flex items-center justify-between gap-4 py-3", !last && "border-b border-border/60")}><span className="text-xs text-muted">{label}</span><span className="text-xs font-bold tabular-nums">{value}</span></div>;
}

function QuickLink({ href, title, detail, icon, last = false }: { href: string; title: string; detail: string; icon: ReactNode; last?: boolean }) {
  return <Link href={href} className={cn("group flex items-center gap-3 py-3", !last && "border-b border-border/60")}>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block text-xs font-bold group-hover:text-primary">{title}</span><span className="mt-0.5 block truncate text-[10px] text-muted">{detail}</span></span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
  </Link>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex flex-col items-center justify-center gap-2 py-6 text-center"><Info className="h-6 w-6 text-muted/50" /><p className="text-sm text-muted">{message}</p></div>;
}
