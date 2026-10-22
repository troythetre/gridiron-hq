import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicBettingProfile } from "@/lib/player-lists";
import { BettingProfileLists } from "./betting-profile-lists";

export default async function PublicBettingProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const profile = await getPublicBettingProfile(profileId);

  if (!profile) {
    return <div className="mx-auto max-w-2xl py-12">
      <Card><CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <Lock className="h-8 w-8 text-muted" />
        <h1 className="text-lg font-bold">This betting profile is private</h1>
        <p className="text-sm text-muted">
          Either this bettor hasn&apos;t made their profile public, or this link is incorrect.
        </p>
      </CardContent></Card>
    </div>;
  }

  return <div className="mx-auto max-w-2xl space-y-6 py-8">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Public betting profile</p>
      <h1 className="mt-1 text-2xl font-black">{profile.displayName}</h1>
    </div>
    <BettingProfileLists lists={profile.lists} />
  </div>;
}
