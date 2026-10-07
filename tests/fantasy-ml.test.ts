import { describe, expect, it } from "vitest";
import type { PlayerProfileData, PlayerWeekStat } from "@/lib/player-profile-types";
import { forecastFantasyScore, trainFantasyScoreModel } from "@/lib/fantasy-ml";

function createWeek(week: number, season: number): PlayerWeekStat {
  return {
    week,
    fantasyPoints: 4 + ((week * 7 + season) % 19) + week * 0.2,
    passingYards: null,
    completions: null,
    attempts: null,
    passingTds: null,
    interceptions: null,
    carries: 3 + (week % 4),
    rushingYards: null,
    rushingTds: null,
    targets: 5 + (week % 5),
    receptions: 3 + (week % 3),
    receivingYards: null,
    receivingTds: null,
    receivingAirYards: null,
    yardsAfterCatch: null,
    targetShare: null,
    airYardsShare: null,
    wopr: null,
    racr: null,
    snapShare: 0.5 + (week % 4) / 10,
  };
}

function createProfile(seasons: number[]): PlayerProfileData {
  const history = seasons.map((season) => ({
    season,
    weeks: Array.from({ length: 14 }, (_, index) => {
      const { week, fantasyPoints, carries, targets, snapShare } = createWeek(index + 1, season);
      return {
        week,
        fantasyPoints,
        rushingYards: null,
        receivingYards: null,
        targetShare: null,
        airYardsShare: null,
        carries,
        targets,
        snapShare,
      };
    }),
  }));
  return {
    name: "Test Player",
    team: "TST",
    position: "RB",
    season: seasons.at(-1) ?? 2024,
    gsisId: null,
    jerseyNumber: null,
    headshotUrl: null,
    birthDate: null,
    height: null,
    weight: null,
    college: null,
    yearsExperience: 2,
    rookieSeason: seasons[0] ?? 2023,
    draftYear: null,
    draftRound: null,
    draftPick: null,
    draftTeam: null,
    status: null,
    weeks: [],
    history,
  };
}

describe("fantasy scoring model validation", () => {
  it("reports no holdout evidence when no earlier season can train the model", () => {
    const model = trainFantasyScoreModel([createProfile([2025])]);

    expect(model.validation.seasons).toEqual([2025]);
    expect(model.validation.samples).toBe(0);
    expect(model.validation.modelMae).toBeNull();
    expect(model.validation.baselineMae).toBeNull();
  });

  it("evaluates the latest season against a prior-season fit and exposes its sample count", () => {
    const model = trainFantasyScoreModel([createProfile([2024, 2025])]);

    expect(model.validation.seasons).toEqual([2025]);
    expect(model.validation.samples).toBe(12);
    expect(Number.isFinite(model.validation.modelMae)).toBe(true);
    expect(Number.isFinite(model.validation.baselineMae)).toBe(true);
  });

  it("does not forecast with too little history or an unsupported position", () => {
    const model = trainFantasyScoreModel([createProfile([2024, 2025])]);
    const history = [createWeek(1, 2025)].map(({ week, fantasyPoints, targets, carries, snapShare }) => ({
      week,
      fantasyPoints,
      targets,
      carries,
      snapShare,
    }));

    expect(forecastFantasyScore(history, "RB", model)).toBeNull();
    expect(forecastFantasyScore(history, "LB", model)).toBeNull();
  });
});
