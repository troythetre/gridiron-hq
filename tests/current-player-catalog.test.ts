import { describe, expect, it } from "vitest";
import type { PlayerProfileData, PlayerWeekStat } from "@/lib/player-profile-types";
import { getCatalogPlayerRanks } from "@/lib/current-player-catalog";

function profile(name: string, position: string, points: number): PlayerProfileData {
  const week: PlayerWeekStat = {
    week: 1,
    fantasyPoints: points,
    passingYards: null,
    completions: null,
    attempts: null,
    passingTds: null,
    interceptions: null,
    carries: null,
    rushingYards: null,
    rushingTds: null,
    targets: null,
    receptions: null,
    receivingYards: null,
    receivingTds: null,
    receivingAirYards: null,
    yardsAfterCatch: null,
    targetShare: null,
    airYardsShare: null,
    wopr: null,
    racr: null,
  };
  return {
    name,
    team: name.slice(0, 3).toUpperCase(),
    position,
    season: 2026,
    gsisId: null,
    jerseyNumber: null,
    headshotUrl: null,
    birthDate: null,
    height: null,
    weight: null,
    college: null,
    yearsExperience: null,
    rookieSeason: null,
    draftYear: null,
    draftRound: null,
    draftPick: null,
    draftTeam: null,
    status: null,
    weeks: [week],
  };
}

describe("getCatalogPlayerRanks", () => {
  it("derives overall and position ranks from the player's current-season points", () => {
    const runningBack = profile("Target Back", "RB", 10);
    const profiles = [
      runningBack,
      profile("Higher Back", "RB", 15),
      profile("Tied Back", "RB", 10),
      profile("Higher Quarterback", "QB", 18),
    ];

    expect(getCatalogPlayerRanks(runningBack, profiles)).toEqual({
      pos_rank: 2,
      overall_rank: 3,
    });
  });

  it("does not rank a player without scored games", () => {
    const noGames = profile("No Games", "RB", 0);
    noGames.weeks[0].fantasyPoints = null;

    expect(getCatalogPlayerRanks(noGames, [noGames])).toEqual({
      pos_rank: null,
      overall_rank: null,
    });
  });
});
