import { Card, CardContent } from "@/components/ui/card";
import { PlayerListGrid } from "@/components/player-list-columns";
import type { PlayerListType } from "@/lib/player-lists";
import type { PlayerRow } from "@/lib/types";

/** Read-only favorites/targets/observed grid for the public profile page. */
export function BettingProfileLists({ lists }: { lists: Record<PlayerListType, PlayerRow[]> }) {
  return <Card><CardContent className="p-5"><PlayerListGrid lists={lists} /></CardContent></Card>;
}
