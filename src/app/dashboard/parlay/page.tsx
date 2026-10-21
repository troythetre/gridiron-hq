import { createClient } from "@/lib/supabase/server";
import { getCollegeFootballRankings } from "@/lib/college-football-live";
import { getPlayers } from "@/lib/data";
import { getNflMockDraft } from "@/lib/nfl-mock-draft";
import { getLinkedSportsbooks } from "@/lib/sportsbook-links";
import { ParlayLab } from "./parlay-lab";

export default async function ParlayPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const initialSport = params.sport === "CFB" ? "CFB" : "NFL";
  const initialTab =
    params.tab === "mock-draft" ||
    params.tab === "college" ||
    params.tab === "rivalries"
      ? params.tab
      // Legacy links with ?tab=parlay (the old standalone Parlay Builder
      // tab) fall back to "sportsbook", which now hosts the parlay slip
      // alongside the sportsbook line comparisons.
      : "sportsbook";

  let linkedSportsbooks: string[] = [];

  if (initialTab === "sportsbook") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      linkedSportsbooks = await getLinkedSportsbooks(user.id);
    }
  }

  const [mockDraft, collegeRankings, players] = await Promise.all([
    initialTab === "mock-draft" ? getNflMockDraft() : Promise.resolve(null),
    initialTab === "college" ? getCollegeFootballRankings() : Promise.resolve(null),
    getPlayers(),
  ]);
  let mockDraftHistory: import("@/lib/nfl-mock-draft").NflMockDraftSnapshot[] = [];
  let mockDraftHistoryReady = true;
  if (initialTab === "mock-draft" && mockDraft && !mockDraft.error) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("nfl_mock_draft_snapshots")
      .select("observed_at,pick,team,team_abbreviation,player,position,college")
      .order("observed_at", { ascending: false })
      .limit(2000);
    if (error?.code === "PGRST205") {
      mockDraftHistoryReady = false;
    } else if (error) {
      throw error;
    } else {
      mockDraftHistory = data ?? [];
    }
  }

  return (
    <ParlayLab
      key={`${initialSport}:${initialTab}`}
      initialSport={initialSport}
      initialTab={initialTab}
      mockDraft={mockDraft}
      collegeRankings={collegeRankings}
      mockDraftHistory={mockDraftHistory}
      mockDraftHistoryReady={mockDraftHistoryReady}
      players={players}
      linkedSportsbooks={linkedSportsbooks}
    />
  );
}
