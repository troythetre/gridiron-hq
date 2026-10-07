"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROSTER_SLOTS, SLOT_ELIGIBLE_POS, type RosterSlotName } from "@/lib/types";

export async function setRosterSlot(
  leagueMemberId: string,
  slot: RosterSlotName,
  playerId: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: player } = await supabase
    .from("players")
    .select("pos")
    .eq("id", playerId)
    .single();
  if (!player || !SLOT_ELIGIBLE_POS[slot].includes(player.pos)) {
    return { error: `${player?.pos ?? "That position"} can't fill the ${slot} slot.` };
  }

  const { error } = await supabase
    .from("roster_slots")
    .upsert(
      { league_member_id: leagueMemberId, slot, player_id: playerId, is_starter: slot !== "BE" },
      { onConflict: "league_member_id,slot" }
    );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/leagues");
  return { error: null };
}

// Function to clear a roster slot for a specific league member
export async function clearRosterSlot(leagueMemberId: string, slot: RosterSlotName) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("roster_slots")
    .delete()
    .eq("league_member_id", leagueMemberId)
    .eq("slot", slot);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/leagues");
  return { error: null };
}

export { ROSTER_SLOTS };
