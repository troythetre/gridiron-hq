"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Flame, Gauge, Medal, Snowflake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HISTORICAL_SEASON_CEILINGS,
  STAT_LABELS,
  blendedPace,
  projectFullSeason,
  type ProjectionCandidate,
  type StatKey,
} from "@/lib/projection-math";
import type { AwardPick } from "@/lib/nfl-season-projections";
import type { WeeklyLeader } from "@/lib/player-projection-model";

function AwardCard({ pick }: { pick: AwardPick }) {
  return <Card><CardContent className="space-y-1.5 p-4">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">{pick.award}</div>
    {pick.winner
      ? <p className="text-sm font-black">{pick.winner.name} <span className="font-semibold text-muted">· {pick.winner.position} · {pick.winner.team}</span></p>
      : <p className="text-sm text-muted">Not enough data yet.</p>}
    <p className="text-[11px] leading-4 text-muted">{pick.rationale}</p>
  </CardContent></Card>;
}

function WeeklyLeaderboardCard({ statKey, leaders }: { statKey: StatKey; leaders: WeeklyLeader[] }) {
  return <Card><CardContent className="space-y-2 p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">{STAT_LABELS[statKey]}</p>
    <div className="space-y-1.5">
      {leaders.length === 0 && <p className="text-xs text-muted">No qualifying players yet this season.</p>}
      {leaders.map((leader, index) => {
        const delta = leader.projectedThisWeek - leader.seasonAverage;
        const hot = delta > leader.seasonAverage * 0.08;
        const cold = delta < -leader.seasonAverage * 0.08;
        return <div key={leader.key} className="flex items-center justify-between gap-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-4 shrink-0 text-right font-black text-muted">{index + 1}</span>
            <span className="truncate font-bold">{leader.name}</span>
            <span className="shrink-0 text-muted">{leader.position} · {leader.team}</span>
            {hot && <Flame className="h-3 w-3 shrink-0 text-orange-400" aria-label="Trending above season average" />}
            {cold && <Snowflake className="h-3 w-3 shrink-0 text-sky-400" aria-label="Trending below season average" />}
          </div>
          <span className="shrink-0 tabular-nums font-bold text-violet-200">{leader.projectedThisWeek.toLocaleString()}</span>
        </div>;
      })}
    </div>
  </CardContent></Card>;
}

function YearlyLeaderboardCard({ statKey, candidates, aggressiveness }: { statKey: StatKey; candidates: ProjectionCandidate[]; aggressiveness: number }) {
  const leaders = useMemo(() => {
    return candidates
      .map((candidate) => ({ candidate, projection: projectFullSeason(blendedPace(candidate, aggressiveness), statKey) }))
      .sort((a, b) => b.projection.value - a.projection.value)
      .slice(0, 5);
  }, [candidates, aggressiveness, statKey]);
  const ceiling = HISTORICAL_SEASON_CEILINGS[statKey];

  return <Card><CardContent className="space-y-2 p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">{STAT_LABELS[statKey]}</p>
    <div className="space-y-1.5">
      {leaders.length === 0 && <p className="text-xs text-muted">No qualifying players yet this season.</p>}
      {leaders.map(({ candidate, projection }, index) => <div key={candidate.key} className="flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-4 shrink-0 text-right font-black text-muted">{index + 1}</span>
          <span className="truncate font-bold">{candidate.name}</span>
          <span className="shrink-0 text-muted">{candidate.position} · {candidate.team}</span>
          {projection.cappedAtRecord && <Medal className="h-3 w-3 shrink-0 text-amber-400" aria-label={`Capped at the NFL single-season record (${ceiling.holder}, ${ceiling.year}) - the model's raw pace projected higher`} />}
        </div>
        <span className="shrink-0 tabular-nums font-bold text-violet-200">{projection.value.toLocaleString()}</span>
      </div>)}
    </div>
    {leaders.some((l) => l.projection.cappedAtRecord) && <p className="pt-1 text-[10px] leading-4 text-muted">
      <Medal className="mr-1 inline h-3 w-3 text-amber-400" />Capped at the real NFL single-season record ({ceiling.value.toLocaleString()}, {ceiling.holder}, {ceiling.year}) - the model&apos;s raw pace projected a total no player has ever actually reached in a season.
    </p>}
  </CardContent></Card>;
}

function AggressivenessSlider({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const label = value < 30 ? "Conservative - full-season pace" : value > 70 ? "Aggressive - recent-form pace" : "Balanced";
  return <Card className="border-dashed">
    <CardContent className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><Gauge className="h-3.5 w-3.5" />Model aggressiveness</div>
        <span className="text-xs font-bold text-foreground">{label}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Model aggressiveness: season pace vs recent-form pace"
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
      />
      <p className="text-[11px] leading-4 text-muted">
        Slide toward <strong className="text-foreground">conservative</strong> to project full-season totals from each
        player&apos;s season-long per-game average, or toward <strong className="text-foreground">aggressive</strong> to
        weight their last {3} games more heavily - leaning into a current hot or cold streak instead of smoothing it out.
        Every leaderboard below recomputes live as you move it.
      </p>
    </CardContent>
  </Card>;
}

export function PredictionsTabs({
  weekly,
  yearly,
  playoffs,
}: {
  weekly: {
    gamesObserved: number;
    leaderboards: { statKey: StatKey; leaders: WeeklyLeader[] }[];
    gameLines: ReactNode;
  };
  yearly: {
    season: number;
    gamesObserved: number;
    candidatesByStat: { statKey: StatKey; candidates: ProjectionCandidate[] }[];
    awards: AwardPick[];
    notModeled: string[];
  };
  playoffs: {
    nflPlayoffPicture: ReactNode;
    cfbPlayoffField: ReactNode;
  };
}) {
  const [aggressiveness, setAggressiveness] = useState(50);

  return <Tabs defaultValue="weekly" className="space-y-5">
    <TabsList>
      <TabsTrigger value="weekly">Weekly</TabsTrigger>
      <TabsTrigger value="yearly">Yearly</TabsTrigger>
      <TabsTrigger value="playoffs">Playoffs</TabsTrigger>
    </TabsList>

    <TabsContent value="weekly" className="space-y-4">
      <p className="text-xs text-muted">
        {weekly.gamesObserved} game{weekly.gamesObserved === 1 ? "" : "s"} observed this season so far. These favor
        recent form over season-long average, since a single upcoming week is closer to &quot;what have you done
        lately&quot; than a full-season estimate.
      </p>
      {weekly.gameLines}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">This week&apos;s model favorites</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weekly.leaderboards.map((board) => <WeeklyLeaderboardCard key={board.statKey} statKey={board.statKey} leaders={board.leaders} />)}
        </div>
      </div>
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-[11px] leading-4 text-muted">
            Player-level sportsbook prop lines (e.g. a specific receiving-yards over/under) aren&apos;t mapped to this
            platform&apos;s player records yet - the odds feed identifies players by an opaque ID with no documented
            name mapping, and showing a side-by-side comparison built on a guessed match risked being confidently
            wrong. Game-level lines above are shown as provided by the feed.
          </p>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="yearly" className="space-y-4">
      <p className="text-xs text-muted">
        {yearly.gamesObserved} game{yearly.gamesObserved === 1 ? "" : "s"} observed this season so far, extrapolated
        to a full 17-game season at the resulting pace.
      </p>
      <AggressivenessSlider value={aggressiveness} onChange={setAggressiveness} />
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Projected award winners</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {yearly.awards.map((pick) => <AwardCard key={pick.award} pick={pick} />)}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Projected statistical leaders (full-season pace)</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {yearly.candidatesByStat.map(({ statKey, candidates }) => <YearlyLeaderboardCard key={statKey} statKey={statKey} candidates={candidates} aggressiveness={aggressiveness} />)}
        </div>
      </div>
      {yearly.notModeled.length > 0 && <Card className="border-dashed">
        <CardContent className="space-y-1 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Not modeled yet</p>
          {yearly.notModeled.map((note) => <p key={note} className="text-[11px] leading-4 text-muted">{note}</p>)}
        </CardContent>
      </Card>}
    </TabsContent>

    <TabsContent value="playoffs" className="space-y-6">
      <section className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">NFL projected final standings</p>
        <Card><CardContent className="p-4">{playoffs.nflPlayoffPicture}</CardContent></Card>
        <p className="text-[11px] leading-4 text-muted">
          Each team&apos;s current record (live via ESPN) extrapolated at its current win rate over the games it has
          left this season. Top 7 per conference is the projected playoff field at season&apos;s end under that
          projection - not the real seeding logic (division winners get an automatic top-4 seed regardless of
          record), and it doesn&apos;t know who&apos;s actually left on each team&apos;s schedule, so an easy or hard
          remaining slate isn&apos;t reflected.
        </p>
      </section>
      <section className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Projected College Football Playoff field</p>
        <Card><CardContent className="p-4">{playoffs.cfbPlayoffField}</CardContent></Card>
        <p className="text-[11px] leading-4 text-muted">
          The current AP Top 25 (not the CFP selection committee&apos;s own ranking, which this feed doesn&apos;t
          expose) as a stand-in for the 12-team field if selection happened today.
        </p>
      </section>
    </TabsContent>
  </Tabs>;
}
