import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSavedParlays } from "@/lib/parlay-account";
import { computeAccountStats } from "@/lib/parlay-format";
import { getBettingProfileVisibility, getPlayerListEntries } from "@/lib/player-lists";
import { ParlayAccountView } from "./parlay-account-view";
import { BettingProfileView } from "./betting-profile-view";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = (user.user_metadata?.display_name as string | undefined) ?? user.email ?? "Bettor";
  const [parlays, lists, isPublic] = await Promise.all([
    getSavedParlays(user.id),
    getPlayerListEntries(user.id),
    getBettingProfileVisibility(user.id),
  ]);
  const stats = computeAccountStats(parlays);

  return <div className="space-y-6">
    <ParlayAccountView displayName={displayName} email={user.email ?? null} parlays={parlays} stats={stats} />
    <BettingProfileView profileId={user.id} isPublic={isPublic} lists={lists} />
  </div>;
}
