import { Suspense } from "react";
import { AlertTriangle, Crown, Flame, GraduationCap, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getNflSeasonProjections, type StatLeaderboard, type AwardPick } from "@/lib/nfl-season-projections";
import { getNflStandings, type NflStandingsGroup } from "@/lib/nfl-standings-live";
import { getCollegeFootballRankings } from "@/lib/college-football-live";

function SectionHeading({ icon: Icon, title, detail }: { icon: typeof ShieldAlert; title: string; detail: string }) {
  return <div className="flex items-start gap-2">
    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-0.5 text-xs text-muted">{detail}</p>
    </div>
  </div>;
}

function LeaderboardCard({ board }: { board: StatLeaderboard }) {
  return <Card><CardContent className="space-y-2 p-4">
    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">{board.label}</p>
    <div className="space-y-1.5">
      {board.leaders.length === 0 && <p className="text-xs text-muted">No qualifying players yet this season.</p>}
      {board.leaders.map((leader, index) => <div key={leader.name} className="flex items-center justify-between gap-2 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-4 shrink-0 text-right font-black text-muted">{index + 1}</span>
          <span className="truncate font-bold">{leader.name}</span>
          <span className="shrink-0 text-muted">{leader.position} · {leader.team}</span>
        </div>
        <span className="shrink-0 tabular-nums font-bold text-violet-200">{leader.projectedFullSeason.toLocaleString()}</span>
      </div>)}
    </div>
  </CardContent></Card>;
}

function AwardCard({ pick }: { pick: AwardPick }) {
  return <Card><CardContent className="space-y-1.5 p-4">
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300"><Crown className="h-3.5 w-3.5" />{pick.award}</div>
    {pick.winner
      ? <p className="text-sm font-black">{pick.winner.name} <span className="font-semibold text-muted">· {pick.winner.position} · {pick.winner.team}</span></p>
      : <p className="text-sm text-muted">Not enough data yet.</p>}
    <p className="text-[11px] leading-4 text-muted">{pick.rationale}</p>
  </CardContent></Card>;
}

function StandingsGroup({ group }: { group: NflStandingsGroup }) {
  return <div className="space-y-1.5">
    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{group.name}</p>
    <div className="space-y-1">
      {group.teams.map((team, index) => <div key={team.team} className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs ${index < 7 ? "border-emerald-300/25 bg-emerald-300/5" : "border-border bg-background/20"}`}>
        <span className="font-bold">{team.team}</span>
        <span className="tabular-nums text-muted">{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ""}</span>
      </div>)}
    </div>
  </div>;
}

function LiveSectionSkeleton() {
  return <div className="grid gap-4 sm:grid-cols-2">
    {[0, 1].map((key) => <div key={key} className="space-y-1.5">
      {[0, 1, 2, 3].map((row) => <div key={row} className="h-7 animate-pulse rounded-lg bg-border/40" />)}
    </div>)}
  </div>;
}

// Each of these awaits one live, unauthenticated ESPN fetch (bounded by a
// 4s timeout in the lib - see nfl-standings-live.ts / college-football-live.ts).
// They're split into their own async components wrapped in Suspense below so
// a slow upstream only delays its own card instead of blocking the whole
// page - this is also why the NFL/CFB nav items used to feel "laggy": the
// entire page previously awaited both live fetches via Promise.all before
// anything painted.
async function NflPlayoffPicture() {
  const nflStandings = await getNflStandings();
  return nflStandings.error
    ? <p className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />Live standings are temporarily unavailable ({nflStandings.error}). Everything else on this page is unaffected.</p>
    : <div className="grid gap-4 sm:grid-cols-2">
      {nflStandings.groups.map((group) => <StandingsGroup key={group.name} group={group} />)}
    </div>;
}

async function CfbPlayoffField() {
  const cfbRankings = await getCollegeFootballRankings();
  const cfbPlayoffField = cfbRankings.teams.slice(0, 12);
  return <>
    {cfbRankings.error
      ? <p className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />Live rankings are temporarily unavailable ({cfbRankings.error}).</p>
      : <div className="grid gap-1.5 sm:grid-cols-2">
        {cfbPlayoffField.map((team) => <div key={team.team} className="flex items-center justify-between rounded-lg border border-border bg-background/20 px-2.5 py-1.5 text-xs">
          <span className="flex items-center gap-2 font-bold"><span className="w-5 shrink-0 text-right text-muted">{team.rank}</span>{team.team}</span>
          <span className="tabular-nums text-muted">{team.record}</span>
        </div>)}
      </div>}
    {cfbRankings.lastUpdated && <p className="mt-2 text-[11px] text-muted">Updated {cfbRankings.week} · source: ESPN</p>}
  </>;
}

export default function PredictionsPage() {
  // Local, synchronous, computed straight from the bundled dataset - no
  // network involved, so this renders immediately without waiting on the
  // live ESPN sections below.
  const nflProjections = getNflSeasonProjections();

  return <div className="mx-auto max-w-5xl space-y-8 pb-10">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Player &amp; team analysis</p>
      <h1 className="mt-1 text-2xl font-black sm:text-3xl">Predictions</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Stat-leader and award projections are computed from real season-to-date per-player data (the same dataset the
        model on the Analytics Engine page trains on), extrapolated to a full season at each player&apos;s current pace.
        Playoff pictures reflect live current standings/rankings, not a full season simulation. Where this platform
        doesn&apos;t yet have the data to back a prediction, that&apos;s stated plainly instead of guessed.
      </p>
    </div>

    <section className="space-y-4">
      <SectionHeading icon={ShieldAlert} title="NFL" detail={`${nflProjections.gamesObserved} game${nflProjections.gamesObserved === 1 ? "" : "s"} observed this season so far`} />

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Playoff picture (live standings)</p>
          <Suspense fallback={<LiveSectionSkeleton />}>
            <NflPlayoffPicture />
          </Suspense>
          <p className="text-[11px] text-muted">Top 7 per conference (highlighted) reflects the current playoff field if the season ended today - not a projection of the final record.</p>
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Projected award winners</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {nflProjections.awards.map((pick) => <AwardCard key={pick.award} pick={pick} />)}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted">Projected statistical leaders (full-season pace)</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nflProjections.leaderboards.map((board) => <LeaderboardCard key={board.statKey} board={board} />)}
        </div>
      </div>

      {nflProjections.notModeled.length > 0 && <Card className="border-dashed">
        <CardContent className="space-y-1 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><AlertTriangle className="h-3.5 w-3.5" />Not modeled yet</p>
          {nflProjections.notModeled.map((note) => <p key={note} className="text-[11px] leading-4 text-muted">{note}</p>)}
        </CardContent>
      </Card>}
    </section>

    <section id="college-football" className="space-y-4 scroll-mt-24">
      <SectionHeading icon={GraduationCap} title="College Football" detail="Projected College Football Playoff field from the latest live AP/CFP-style rankings." />
      <Card>
        <CardContent className="p-4">
          <Suspense fallback={<LiveSectionSkeleton />}>
            <CfbPlayoffField />
          </Suspense>
        </CardContent>
      </Card>
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-2 p-4">
          <Flame className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <p className="text-[11px] leading-4 text-muted">
            Heisman and college statistical-leader projections aren&apos;t modeled yet - the data pipeline currently
            ingests NFL play-by-play and player stats (nflverse) but no equivalent college football player dataset.
            Adding one is the natural next step for this section.
          </p>
        </CardContent>
      </Card>
    </section>
  </div>;
}
