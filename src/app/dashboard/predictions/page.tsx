import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";
import { getNflSeasonProjections } from "@/lib/nfl-season-projections";
import { getNflStandings, type NflStandingsGroup, type NflStandingsTeam } from "@/lib/nfl-standings-live";
import { getCollegeFootballRankings } from "@/lib/college-football-live";
import { getWeeklyGameLines } from "@/lib/weekly-game-lines";
import { getProjectionCandidates, getWeeklyLeaders, gamesObservedThisSeason } from "@/lib/player-projection-model";
import { REGULAR_SEASON_GAMES, STAT_KEYS } from "@/lib/projection-math";
import { PredictionsTabs } from "./predictions-tabs";

type ProjectedStandingsTeam = NflStandingsTeam & {
  gamesPlayed: number;
  projectedWins: number;
  projectedLosses: number;
};

/**
 * Straight-line extrapolation of each team's current win rate over the
 * games it has left in a 17-game season - the same "pace over the
 * remaining sample" idea the player projections use, applied to team
 * records instead of player stats. It has no access to remaining-schedule
 * strength (who's left on the slate, home/away, injuries), so it's a
 * simple projection, not a full season simulation - that's stated in the
 * tab copy, not hidden.
 */
function projectStandingsTeam(team: NflStandingsTeam): ProjectedStandingsTeam {
  const gamesPlayed = team.wins + team.losses + team.ties;
  const remaining = Math.max(0, REGULAR_SEASON_GAMES - gamesPlayed);
  const pace = team.winPercent ?? (gamesPlayed > 0 ? team.wins / gamesPlayed : 0);
  const projectedWins = Math.min(REGULAR_SEASON_GAMES - team.ties, team.wins + pace * remaining);
  const projectedLosses = Math.max(0, REGULAR_SEASON_GAMES - team.ties - projectedWins);
  return { ...team, gamesPlayed, projectedWins, projectedLosses };
}

function StandingsGroup({ group }: { group: NflStandingsGroup }) {
  const projected = group.teams
    .map(projectStandingsTeam)
    .sort((a, b) => b.projectedWins - a.projectedWins || (b.winPercent ?? 0) - (a.winPercent ?? 0));
  return <div className="space-y-1.5">
    <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">{group.name}</p>
    <div className="space-y-1">
      {projected.map((team, index) => <div key={team.team} className={`flex items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5 text-xs ${index < 7 ? "border-emerald-300/25 bg-emerald-300/5" : "border-border bg-background/20"}`}>
        <span className="truncate font-bold">{team.team}</span>
        <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
          <span className="text-muted">{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ""}</span>
          <span className="text-[10px] text-sky-300">&rarr; {team.projectedWins.toFixed(1)}-{team.projectedLosses.toFixed(1)} proj.</span>
        </span>
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

function LinesSkeleton() {
  return <div className="space-y-1.5">
    {[0, 1, 2].map((row) => <div key={row} className="h-9 animate-pulse rounded-lg bg-border/40" />)}
  </div>;
}

// Each of these awaits one live, unauthenticated fetch (bounded by a
// timeout in its own lib - see nfl-standings-live.ts, college-football-live.ts,
// sports-game-odds.ts). They're split into their own async components
// wrapped in Suspense so a slow upstream only delays its own card instead
// of blocking the whole page.
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

async function WeeklyLines() {
  const lines = await getWeeklyGameLines();
  if (lines.error) {
    return <p className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0" />Live market lines are temporarily unavailable ({lines.error}).</p>;
  }
  return <div className="space-y-1.5">
    {lines.games.slice(0, 8).map((game) => <div key={game.eventId} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/20 px-3 py-2 text-xs">
      <span className="truncate font-bold">{game.awayTeam} @ {game.homeTeam}</span>
      <span className="shrink-0 tabular-nums text-muted">{game.spread ? `Spread ${game.spread}` : null}{game.spread && game.total ? " · " : null}{game.total ? `O/U ${game.total}` : null}</span>
    </div>)}
  </div>;
}

export default function PredictionsPage() {
  // Local, synchronous, computed straight from the bundled dataset - no
  // network involved, so this renders immediately without waiting on the
  // live ESPN/odds sections.
  const nflProjections = getNflSeasonProjections();
  const gamesObserved = gamesObservedThisSeason();
  const weeklyLeaderboards = STAT_KEYS.map((statKey) => ({ statKey, leaders: getWeeklyLeaders(statKey) }));
  // Only ship the top 25 candidates per category (with their last-5-game
  // logs) to the client for the Yearly tab's slider to recompute against -
  // not the full dataset.
  const candidatesByStat = STAT_KEYS.map((statKey) => ({ statKey, candidates: getProjectionCandidates(statKey, 25) }));

  return <div className="mx-auto max-w-5xl space-y-6 pb-10">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Player &amp; team analysis</p>
      <h1 className="mt-1 text-2xl font-black sm:text-3xl">Predictions</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Computed from real season-to-date per-player and per-team data (the same dataset the model on the
        Analytics Engine page trains on). Weekly favors recent form; Yearly extrapolates a full-season pace you can
        tune, capped at real NFL single-season records so a hot early stretch can&apos;t project an unprecedented
        total; Playoffs projects each team&apos;s final record by extrapolating its current win rate over its
        remaining games - a straight-line projection, not a full schedule simulation. Where this platform
        doesn&apos;t yet have the data to back a prediction, that&apos;s stated plainly instead of guessed.
      </p>
    </div>

    <PredictionsTabs
      weekly={{
        gamesObserved,
        leaderboards: weeklyLeaderboards,
        gameLines: <Suspense fallback={<LinesSkeleton />}><WeeklyLines /></Suspense>,
      }}
      yearly={{
        season: nflProjections.season,
        gamesObserved: nflProjections.gamesObserved,
        candidatesByStat,
        awards: nflProjections.awards,
        notModeled: nflProjections.notModeled,
      }}
      playoffs={{
        nflPlayoffPicture: <Suspense fallback={<LiveSectionSkeleton />}><NflPlayoffPicture /></Suspense>,
        cfbPlayoffField: <Suspense fallback={<LinesSkeleton />}><CfbPlayoffField /></Suspense>,
      }}
    />
  </div>;
}
