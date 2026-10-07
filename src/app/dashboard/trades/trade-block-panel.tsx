"use client";

import { useState, useTransition } from "react";
import type { PlayerRow } from "@/lib/types";
import { listOnTradeBlock, unlistFromTradeBlock } from "@/app/actions/trades";
import { PosBadge } from "@/components/pos-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tag, X } from "lucide-react";

export interface TradeBlockEntry {
  id: string;
  leagueMemberId: string;
  teamName: string;
  player: PlayerRow;
  note: string | null;
  isMine: boolean;
}

export function TradeBlockPanel({
  entries,
  myMemberId,
  myRoster,
}: {
  entries: TradeBlockEntry[];
  myMemberId: string;
  myRoster: PlayerRow[];
}) {
  // Form state
  const [pendingId, setPendingId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const listedIds = new Set(entries.filter((e) => e.isMine).map((e) => e.player.id));
  const listablePlayers = myRoster.filter((p) => !listedIds.has(p.id));
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [note, setNote] = useState("");

  // Handle listing a player on the trade block, sending the request to the server and updating state based on the response.
  function handleList() {
    if (!selectedPlayerId) return;
    setError(null);
    setPendingId("list");
    startTransition(async () => {
      const res = await listOnTradeBlock(myMemberId, Number(selectedPlayerId), note.trim() || undefined);
      if (res?.error) setError(res.error);
      setSelectedPlayerId("");
      setNote("");
      setPendingId(null);
    });
  }

  // Handle unlisting a player from the trade block, sending the request to the server and updating state based on the response.
  function handleUnlist(playerId: number) {
    setError(null);
    setPendingId(playerId);
    startTransition(async () => {
      const res = await unlistFromTradeBlock(myMemberId, playerId);
      if (res?.error) setError(res.error);
      setPendingId(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade block</CardTitle>
        <CardDescription>Players anyone in the league has flagged as available.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="space-y-2">
          {entries.length === 0 && <p className="text-sm text-muted">No one has listed a player yet.</p>}
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-background/30 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <PosBadge pos={e.player.pos} />
                <span className="text-sm font-medium">{e.player.name}</span>
                <span className="text-xs text-muted">{e.teamName}</span>
                {e.note && <span className="text-xs italic text-muted">&quot;{e.note}&quot;</span>}
              </div>
              {e.isMine && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pendingId === e.player.id}
                  onClick={() => handleUnlist(e.player.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3">
          <p className="mb-2 text-sm font-medium">List one of your players</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="sm:flex-1">
                <SelectValue placeholder="Choose a player" />
              </SelectTrigger>
              <SelectContent>
                {listablePlayers.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} ({p.pos})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="sm:flex-1"
            />
            <Button disabled={!selectedPlayerId || pendingId === "list"} onClick={handleList} className="gap-1.5">
              <Tag className="h-3.5 w-3.5" /> List
            </Button>
          </div>
          {listablePlayers.length === 0 && myRoster.length > 0 && (
            <p className="mt-1 text-xs text-muted">Every player on your roster is already listed.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
