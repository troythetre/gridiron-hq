"use client";

import { useState, useTransition } from "react";
import type { PlayerRow, RosterSlotName } from "@/lib/types";
import { SLOT_ELIGIBLE_POS } from "@/lib/types";
import { setRosterSlot, clearRosterSlot } from "@/app/actions/leagues";
import { PosBadge } from "@/components/pos-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface SlotAssignment {
  slot: RosterSlotName;
  player: PlayerRow | null;
}

export function RosterEditor({
  leagueMemberId,
  assignments,
  allPlayers,
  editable,
}: {
  leagueMemberId: string;
  assignments: SlotAssignment[];
  allPlayers: PlayerRow[];
  editable: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Handlers for assigning and clearing roster slots
  function handleAssign(slot: RosterSlotName, playerId: string) {
    setError(null);
    startTransition(async () => {
      const res = await setRosterSlot(leagueMemberId, slot, Number(playerId));
      if (res?.error) setError(res.error);
    });
  }

  // Handler for clearing a roster slot
  function handleClear(slot: RosterSlotName) {
    setError(null);
    startTransition(async () => {
      const res = await clearRosterSlot(leagueMemberId, slot);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      {assignments.map(({ slot, player }) => {
        const eligible = allPlayers.filter((p) => SLOT_ELIGIBLE_POS[slot].includes(p.pos));
        return (
          <div
            key={slot}
            className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface px-3 py-2"
          >
            <span className="w-14 shrink-0 text-xs font-semibold text-muted">{slot}</span>
            {player ? (
              <div className="flex flex-1 items-center gap-2">
                <PosBadge pos={player.pos} />
                <span className="text-sm font-medium">{player.name}</span>
                <span className="text-xs text-muted">{player.team}</span>
                <span className="ml-auto text-sm text-muted">{player.avg_pts.toFixed(1)} avg</span>
              </div>
            ) : (
              <span className="flex-1 text-sm text-muted">Empty</span>
            )}
            {editable && (
              <div className="flex items-center gap-1">
                <Select
                  disabled={pending}
                  value={player ? String(player.id) : undefined}
                  onValueChange={(v) => handleAssign(slot, v)}
                >
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Assign player" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {eligible.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.pos})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {player && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={pending}
                    onClick={() => handleClear(slot)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
