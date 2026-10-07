import type { InjuryRow, MarketHistoryPoint, NewsItemRow, PlayerMarketRow } from "@/lib/types";
import type { PlayerProfileData, PlayerWeekStat } from "@/lib/player-profile-types";

export type MarketLens = "ppr" | "half_ppr" | "dynasty";

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function points(week: PlayerWeekStat, lens: MarketLens) {
  const half = week.fantasyPoints ?? 0;
  if (lens === "ppr") return half + (week.receptions ?? 0) * 0.5;
  return half;
}

function practiceMove(item: NewsItemRow | undefined) {
  if (!item) return 0;
  const text = normalize(`${item.headline} ${item.body ?? ""}`);
  if (/did not practice|didn t practice|not practicing|will not practice|\bdnp\b|ruled out|placed on ir|injured reserve|setback|demoted|lost his role|lost her role/.test(text)) return -4;
  if (/first team reps|working with the ones|promoted|named the starter|lead back/.test(text)) return 2;
  if (/limited participant|limited in practice|limited practice/.test(text)) return -1.5;
  if (/full participant|full practice|returned to practice|cleared to practice/.test(text)) return 1.5;
  if (/expected to play|cleared|no limitations/.test(text)) return 2;
  return 0;
}

export function buildPlayerMarket(
  profiles: PlayerProfileData[],
  injuries: InjuryRow[],
  news: NewsItemRow[],
  lens: MarketLens,
  rankedKeys: Set<string>
): PlayerMarketRow[] {
  const skillProfiles = profiles.filter((profile) => ["QB", "RB", "WR", "TE", "K"].includes(profile.position));
  const positionWeekMeans = new Map<string, number>();
  const positionWeekCounts = new Map<string, number>();

  for (const profile of skillProfiles) {
    for (const week of profile.weeks) {
      if (week.fantasyPoints == null) continue;
      const key = `${profile.position}:${week.week}`;
      positionWeekMeans.set(key, (positionWeekMeans.get(key) ?? 0) + points(week, lens));
      positionWeekCounts.set(key, (positionWeekCounts.get(key) ?? 0) + 1);
    }
  }
  for (const [key, total] of positionWeekMeans) {
    positionWeekMeans.set(key, total / (positionWeekCounts.get(key) ?? 1));
  }

  const injuryByPlayer = new Map(injuries.map((injury) => [normalize(injury.name), injury]));
  const currentDate = Date.now();
  const marketRows = skillProfiles.map((profile) => {
    const gameWeeks = profile.weeks.filter((week) => week.fantasyPoints != null).sort((a, b) => a.week - b.week);
    const history: MarketHistoryPoint[] = [];
    let price = 100;
    for (const week of gameWeeks) {
      const average = positionWeekMeans.get(`${profile.position}:${week.week}`) ?? 0;
      const relativePerformance = average > 0 ? points(week, lens) / average - 1 : 0;
      price *= 1 + clamp(relativePerformance * 0.065, -0.12, 0.12);
      history.push({ week: week.week, price: Number(price.toFixed(2)) });
    }

    const nameKey = normalize(profile.name);
    const playerStories = news.filter((item) => {
      const age = item.item_date ? currentDate - new Date(`${item.item_date}T23:59:59`).getTime() : Infinity;
      const text = normalize(`${item.headline} ${item.body ?? ""}`);
      return age <= 7 * 24 * 60 * 60 * 1000 && (` ${text} `).includes(` ${nameKey} `);
    }).sort((a, b) => (b.item_date ?? "").localeCompare(a.item_date ?? ""));
    const practiceStory = playerStories.find((item) => item.topics?.includes("practice") || /practice|participant|walkthrough/i.test(`${item.headline} ${item.body ?? ""}`));
    const catalyst = practiceMove(practiceStory);

    const injury = injuryByPlayer.get(nameKey);
    const injuryMove = injury?.status === "OUT" ? -8
      : injury?.status === "DOUBTFUL" ? -4
        : injury?.status === "QUESTIONABLE" ? -2
          : injury?.status === "MONITOR" ? -0.5 : 0;
    const lastWeekMove = gameWeeks.length > 0 ? clamp(((price / (history.length > 1 ? history[history.length - 2].price : 100)) - 1) * 100, -12, 12) : 0;
    const currentMove = clamp(lastWeekMove + catalyst + injuryMove, -15, 15);

    if (lens === "dynasty") {
      const experience = profile.yearsExperience ?? 5;
      const futureValueFactor = clamp((6 - experience) * 1.1, -8, 6);
      price *= 1 + futureValueFactor / 100;
    }
    price *= 1 + (catalyst + injuryMove) / 100;
    if (history.length === 0) history.push({ week: 0, price: Number((100 * (lens === "dynasty" ? 1 + clamp((6 - (profile.yearsExperience ?? 5)) * 1.1, -8, 6) / 100 : 1)).toFixed(2)) });
    history.push({ week: Math.max(0, ...gameWeeks.map((week) => week.week)) + 0.1, price: Number(price.toFixed(2)) });

    const weeklyReturns = gameWeeks.slice(1).map((week, index) => {
      const previous = gameWeeks[index];
      const before = points(previous, lens);
      return Math.abs(before) < 0.1 ? 0 : (points(week, lens) - before) / Math.max(before, 1);
    });
    const spread = weeklyReturns.length ? Math.sqrt(weeklyReturns.reduce((sum, value) => sum + value * value, 0) / weeklyReturns.length) : 0;
    const averagePoints = gameWeeks.length ? gameWeeks.reduce((sum, week) => sum + points(week, lens), 0) / gameWeeks.length : 0;
    const story = practiceStory ?? playerStories[0];
    const isRanked = rankedKeys.has(`${profile.name.toLowerCase()}|${profile.team}`);
    const volatility: PlayerMarketRow["volatility"] = spread > 0.65 ? "HIGH" : spread > 0.3 ? "MEDIUM" : "LOW";

    return {
      id: profile.gsisId ?? `${normalize(profile.name).replace(/ /g, "-")}-${profile.team}`,
      name: profile.name,
      pos: profile.position,
      team: profile.team,
      price: Number(price.toFixed(2)),
      changePct: Number(currentMove.toFixed(1)),
      history: history.slice(-6),
      catalyst: injury ? `${injury.status}: ${injury.injury}` : story?.headline ?? null,
      catalystUrl: story?.article_url ?? null,
      games: gameWeeks.length,
      averagePoints: Number(averagePoints.toFixed(1)),
      volatility,
      isRanked,
    };
  });

  return marketRows.filter((row) => row.games > 0 || row.isRanked);
}
