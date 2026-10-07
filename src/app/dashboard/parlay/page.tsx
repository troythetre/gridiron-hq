import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasActiveMembership } from "@/lib/membership";
import { MEMBERSHIP_PLANS } from "@/lib/membership-plans";
import { getCollegeFootballRankings } from "@/lib/college-football-live";
import { getNflMockDraft } from "@/lib/nfl-mock-draft";
import { ParlayLab } from "./parlay-lab";

export default async function ParlayPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const initialSport = params.sport === "CFB" ? "CFB" : "NFL";
  const initialTab =
    params.tab === "mock-draft" || params.tab === "college" || params.tab === "rivalries"
      ? params.tab
      : "parlay";

  if (initialTab === "parlay") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const productKey = initialSport === "NFL" ? "nfl_betting" : "cfb_betting";
    const hasAccess = !!user && await hasActiveMembership(user.id, user.email, productKey);
    if (!hasAccess) {
      const plan = MEMBERSHIP_PLANS[productKey];
      return <div className="mx-auto max-w-3xl rounded-3xl border border-violet-400/20 bg-surface p-8 sm:p-12">
        <p className="text-xs font-black uppercase tracking-widest text-violet-300">{plan.sport} betting membership</p>
        <h1 className="mt-3 font-display text-4xl font-black">{plan.name}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">The {plan.sport} parlay builder is part of this separate $4.99/month membership. Subscribe or manage your plans from Memberships.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/membership" className="rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground">View membership plans</Link>
          <Link href="/dashboard" className="rounded-full border border-border px-6 py-3 text-sm font-bold">Back to dashboard</Link>
        </div>
      </div>;
    }
  }

  const [mockDraft, collegeRankings] = await Promise.all([
    initialTab === "mock-draft" ? getNflMockDraft() : Promise.resolve(null),
    initialTab === "college" ? getCollegeFootballRankings() : Promise.resolve(null),
  ]);

  return (
    <ParlayLab
      key={`${initialSport}:${initialTab}`}
      initialSport={initialSport}
      initialTab={initialTab}
      mockDraft={mockDraft}
      collegeRankings={collegeRankings}
    />
  );
}
