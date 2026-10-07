import { describe, expect, it } from "vitest";
import { compareScoringTrend } from "@/lib/player-trends";

describe("compareScoringTrend", () => {
  it("labels higher recent scoring as rising with two full three-game windows", () => {
    expect(compareScoringTrend([10, 12, 11, 14, 15, 16])).toEqual({
      direction: "rising",
      delta: 4,
      recentSamples: 3,
      priorSamples: 3,
    });
  });

  it("labels lower recent scoring as falling", () => {
    expect(compareScoringTrend([14, 15, 16, 10, 12, 11]).direction).toBe("falling");
  });

  it("treats changes below the practical threshold as steady", () => {
    expect(compareScoringTrend([10, 10, 10, 10.2, 10.2, 10.2]).direction).toBe("steady");
  });

  it("does not assign a trend with fewer than six scored games", () => {
    expect(compareScoringTrend([10, 12, 11, 14, 15])).toEqual({
      direction: "limited",
      delta: null,
      recentSamples: 3,
      priorSamples: 2,
    });
  });

  it("does not treat non-finite scores as evidence", () => {
    expect(compareScoringTrend([10, Number.NaN, 11, Number.POSITIVE_INFINITY, 15, 16]).direction).toBe("limited");
  });
});
