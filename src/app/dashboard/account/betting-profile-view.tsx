"use client";

import Link from "next/link";
import { Globe, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerListGrid } from "@/components/player-list-columns";
import type { PlayerListType } from "@/lib/player-lists";
import type { PlayerRow } from "@/lib/types";
import { setBettingProfileVisibility } from "@/app/actions/player-lists";

export function BettingProfileView({ profileId, isPublic, lists }: {
  profileId: string;
  isPublic: boolean;
  lists: Record<PlayerListType, PlayerRow[]>;
}) {
  const publicUrl = `/dashboard/bettor/${profileId}`;
  return <Card>
    <CardContent className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Betting profile</h2>
          <p className="mt-1 text-xs text-muted">
            Your favorite, targeted, and observed players. Share it as a public read-only page, or keep it to yourself.
          </p>
          {isPublic && <Link href={publicUrl} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-violet-300 hover:underline">
            <Globe className="h-3.5 w-3.5" />View your public profile
          </Link>}
        </div>
        <form action={setBettingProfileVisibility}>
          <input type="hidden" name="isPublic" value={isPublic ? "false" : "true"} />
          <button
            type="submit"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              isPublic
                ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/15"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {isPublic ? "Public" : "Private"} · tap to {isPublic ? "make private" : "make public"}
          </button>
        </form>
      </div>
      <PlayerListGrid lists={lists} />
    </CardContent>
  </Card>;
}
