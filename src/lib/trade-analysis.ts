import type { PlayerProfileData, PlayerWeekStat } from "@/lib/player-profile-types";
import type { PlayerRow, PlayerTradeContext } from "@/lib/types";

type ProfileSeason = {
  season: number;
  weeks: Partial<PlayerWeekStat>[];
};

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function tradeProfileKey(name: string, team: string) {
  return `${normalize(name)}:${normalize(team)}`;
}

function seasonWeeks(profile: PlayerProfileData): ProfileSeason[] {
  const seasons = new Map<number, Partial<PlayerWeekStat>[]>();
  for (const season of profile.history ?? []) {
    seasons.set(season.season, season.weeks);
  }
  seasons.set(profile.season, profile.weeks);
  return [...seasons.entries()].map(([season, weeks]) => ({ season, weeks }));
}

function mean(values: (number | null | undefined)[]) {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null;
}

function seasonAverage(weeks: Partial<PlayerWeekStat>[]) {
  return mean(weeks.map((week) => week.fantasyPoints));
}

function opportunityPerGame(weeks: Partial<PlayerWeekStat>[]) {
  const perGame = weeks
    .filter((week) => typeof week.fantasyPoints === "number")
    .map((week) => (week.targets ?? 0) + (week.carries ?? 0));
  return mean(perGame);
}

function developmentSlope(seasons: { season: number; average: number }[]) {
  if (seasons.length < 2) return null;
  const recent = seasons.slice(-3);
  const xMean = (recent.length - 1) / 2;
  const yMean = recent.reduce((sum, item) => sum + item.average, 0) / recent.length;
  const numerator = recent.reduce((sum, item, index) => sum + (index - xMean) * (item.average - yMean), 0);
  const denominator = recent.reduce((sum, _, index) => sum + (index - xMean) ** 2, 0);
  return denominator ? numerator / denominator : null;
}

function currentTeamPassRates(profiles: PlayerProfileData[]) {
  const totals = new Map<string, { attempts: number; carries: number }>();
  for (const profile of profiles) {
    const key = normalize(profile.team);
    const total = totals.get(key) ?? { attempts: 0, carries: 0 };
    for (const week of profile.weeks) {
      total.attempts += week.attempts ?? 0;
      total.carries += week.carries ?? 0;
    }
    totals.set(key, total);
  }
  const rates = new Map([...totals].map(([key, total]) => [
    key,
    total.attempts + total.carries > 0 ? total.attempts / (total.attempts + total.carries) : null,
  ]));
  const leagueRate = mean([...totals.values()].map((total) =>
    total.attempts + total.carries > 0 ? total.attempts / (total.attempts + total.carries) : null
  ));
  return { rates, leagueRate };
}

export function buildTradeContextMap(profiles: PlayerProfileData[]) {
  const { rates: teamRates, leagueRate } = currentTeamPassRates(profiles);
  const result = new Map<string, PlayerTradeContext>();
  for (const profile of profiles) {
    const seasons = seasonWeeks(profile).sort((a, b) => a.season - b.season);
    const seasonAverages = seasons
      .map((season) => ({ season: season.season, average: seasonAverage(season.weeks) }))
      .filter((season): season is { season: number; average: number } => season.average != null);
    const current = seasons.find((season) => season.season === profile.season);
    const previous = [...seasons].reverse().find((season) => season.season < profile.season);
    const completedAverages = seasonAverages.filter((season) => season.season < profile.season);
    const careerAverage = mean(seasons.flatMap((season) =>
      season.weeks.map((week) => week.fantasyPoints)
    ));
    const currentSeasonAverage = current ? seasonAverage(current.weeks) : null;
    const priorSeasonAverage = previous ? seasonAverage(previous.weeks) : null;
    const currentOpportunity = current ? opportunityPerGame(current.weeks) : null;
    const priorOpportunity = previous ? opportunityPerGame(previous.weeks) : null;
    const currentRate = teamRates.get(normalize(profile.team)) ?? null;
    result.set(tradeProfileKey(profile.name, profile.team), {
      careerAverage,
      priorSeasonAverage,
      currentSeasonAverage,
      seasonChange: currentSeasonAverage != null && priorSeasonAverage != null
        ? currentSeasonAverage - priorSeasonAverage
        : null,
      developmentPerSeason: developmentSlope(completedAverages),
      opportunityChangePct: currentOpportunity != null && priorOpportunity != null && priorOpportunity > 0
        ? ((currentOpportunity - priorOpportunity) / priorOpportunity) * 100
        : null,
      teamPassRate: currentRate,
      leaguePassRate: leagueRate,
    });
  }
  return result;
}

export function enrichTradePlayers(
  players: PlayerRow[],
  contexts: Map<string, PlayerTradeContext>,
) {
  return players.map((player) => ({
    ...player,
    tradeContext: contexts.get(tradeProfileKey(player.name, player.team)) ?? null,
  }));
}

export function getLatestPlayerWeek(profiles: PlayerProfileData[]) {
  return profiles.reduce((latest, profile) =>
    Math.max(latest, ...profile.weeks.map((week) => week.week)), 0);
}
