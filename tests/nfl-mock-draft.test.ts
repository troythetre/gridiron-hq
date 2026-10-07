import { describe, expect, it } from "vitest";
import { parseNflMockDraft } from "@/lib/nfl-mock-draft";

describe("parseNflMockDraft", () => {
  it("extracts pick, team, prospect, position, and college from source markup", () => {
    const html = `
      <title>2027 NFL Mock Draft</title>
      <p>Player Rankings updated 3 days ago</p>
      <div class="mock-row nfl">
        <div class="mock-row-pick-number">1</div>
        <div class="mock-row-logo"><a href="/nfl/texans"><img alt="HOU" /></a></div>
        <div class="mock-row-player"><a><div class="mock-row-name">Jeremiah Smith</div>
        <div class="mock-row-school-position">WR | Ohio State </div></a></div>
      </div>
    `;

    expect(parseNflMockDraft(html)).toMatchObject({
      title: "2027 NFL Mock Draft",
      updated: "3 days ago",
      picks: [{
        pick: 1,
        team: "Houston Texans",
        teamAbbreviation: "HOU",
        player: "Jeremiah Smith",
        position: "WR",
        college: "Ohio State",
      }],
      error: null,
    });
  });

  it("reports when source markup has no picks", () => {
    expect(parseNflMockDraft("<title>Draft</title>").error).toBe(
      "The source did not return any mock-draft picks.",
    );
  });
});
