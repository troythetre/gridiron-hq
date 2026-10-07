"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROSTER_SLOTS, SLOT_ELIGIBLE_POS, type Position, type RosterSlotName } from "@/lib/types";

type Result = { error?: string };

async function requireMemberOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  leagueMemberId: string
): Promise<Result> {
  const { data } = await supabase
    .from("league_members")
    .select("id, profile_id")
    .eq("id", leagueMemberId)
    .maybeSingle();
  if (!data || data.profile_id !== userId) return { error: "That's not your team." };
  return {};
}

// ============================================================================
// Trade block: list / unlist a player from your roster as available to trade.
// ============================================================================
export async function listOnTradeBlock(leagueMemberId: string, playerId: number, note?: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const own = await requireMemberOwnership(supabase, user.id, leagueMemberId);
  if (own.error) return own;

  const { error } = await supabase
    .from("trade_block")
    .upsert(
      { league_member_id: leagueMemberId, player_id: playerId, note: note ?? null },
      { onConflict: "league_member_id,player_id" }
    );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/trades");
  revalidatePath("/dashboard/leagues");
  return {};
}

export async function unlistFromTradeBlock(leagueMemberId: string, playerId: number): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const own = await requireMemberOwnership(supabase, user.id, leagueMemberId);
  if (own.error) return own;

  const { error } = await supabase
    .from("trade_block")
    .delete()
    .eq("league_member_id", leagueMemberId)
    .eq("player_id", playerId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/trades");
  return {};
}

// ============================================================================
// Trade offers
// ============================================================================
export async function proposeTrade(input: {
  leagueId: string;
  proposerMemberId: string;
  recipientMemberId: string;
  givingPlayerIds: number[];
  receivingPlayerIds: number[];
  note?: string;
}): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const own = await requireMemberOwnership(supabase, user.id, input.proposerMemberId);
  if (own.error) return own;

  if (input.givingPlayerIds.length === 0 || input.receivingPlayerIds.length === 0) {
    return { error: "Pick at least one player on each side." };
  }
  if (input.proposerMemberId === input.recipientMemberId) {
    return { error: "Pick a different team to trade with." };
  }

  const { data: offer, error: offerError } = await supabase
    .from("trade_offers")
    .insert({
      league_id: input.leagueId,
      proposer_member_id: input.proposerMemberId,
      recipient_member_id: input.recipientMemberId,
      note: input.note ?? null,
    })
    .select()
    .single();
  if (offerError) return { error: offerError.message };

  const items = [
    ...input.givingPlayerIds.map((playerId) => ({
      trade_offer_id: offer.id,
      player_id: playerId,
      from_member_id: input.proposerMemberId,
    })),
    ...input.receivingPlayerIds.map((playerId) => ({
      trade_offer_id: offer.id,
      player_id: playerId,
      from_member_id: input.recipientMemberId,
    })),
  ];

  const { error: itemsError } = await supabase.from("trade_offer_items").insert(items);
  if (itemsError) {
    await supabase.from("trade_offers").delete().eq("id", offer.id);
    return { error: itemsError.message };
  }

  revalidatePath("/dashboard/trades");
  return {};
}

/** Finds the first open, position-eligible slot for a member and assigns the player to it. */
async function assignToOpenSlot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leagueMemberId: string,
  playerId: number,
  pos: Position
) {
  const { data: existingSlots } = await supabase
    .from("roster_slots")
    .select("slot")
    .eq("league_member_id", leagueMemberId);
  const occupied = new Set((existingSlots ?? []).map((s) => s.slot as RosterSlotName));

  const openSlot = ROSTER_SLOTS.find((slot) => !occupied.has(slot) && SLOT_ELIGIBLE_POS[slot].includes(pos));
  if (!openSlot) return; // no room - the user can rearrange manually via the roster editor

  await supabase
    .from("roster_slots")
    .upsert(
      { league_member_id: leagueMemberId, slot: openSlot, player_id: playerId, is_starter: openSlot !== "BE" },
      { onConflict: "league_member_id,slot" }
    );
}

export async function respondToTrade(
  offerId: string,
  action: "ACCEPT" | "REJECT" | "CANCEL"
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: offer } = await supabase
    .from("trade_offers")
    .select("*, proposer:league_members!trade_offers_proposer_member_id_fkey(id, profile_id), recipient:league_members!trade_offers_recipient_member_id_fkey(id, profile_id)")
    .eq("id", offerId)
    .maybeSingle();
  if (!offer) return { error: "Trade offer not found." };
  if (offer.status !== "PENDING") return { error: "This offer has already been resolved." };

  const proposer = Array.isArray(offer.proposer) ? offer.proposer[0] : offer.proposer;
  const recipient = Array.isArray(offer.recipient) ? offer.recipient[0] : offer.recipient;

  const isProposer = proposer?.profile_id === user.id;
  const isRecipient = recipient?.profile_id === user.id;
  if (!isProposer && !isRecipient) return { error: "This isn't your trade." };

  if (action === "CANCEL" && !isProposer) return { error: "Only the sender can cancel an offer." };
  if ((action === "ACCEPT" || action === "REJECT") && !isRecipient) {
    return { error: "Only the recipient can accept or reject an offer." };
  }

  if (action === "ACCEPT") {
    const { data: items } = await supabase
      .from("trade_offer_items")
      .select("player_id, from_member_id, players(pos)")
      .eq("trade_offer_id", offerId);

    for (const item of items ?? []) {
      const toMemberId = item.from_member_id === proposer?.id ? recipient?.id : proposer?.id;
      if (!toMemberId) continue;
      const playersRel = item.players as { pos: Position }[] | { pos: Position } | null;
      const playerPos = Array.isArray(playersRel) ? playersRel[0]?.pos : playersRel?.pos;

      await supabase
        .from("roster_slots")
        .delete()
        .eq("league_member_id", item.from_member_id)
        .eq("player_id", item.player_id);

      if (playerPos) {
        await assignToOpenSlot(supabase, toMemberId, item.player_id, playerPos as Position);
      }
    }

    // Both players are off the market once the trade actually goes through.
    await supabase.from("trade_block").delete().in("league_member_id", [proposer?.id, recipient?.id]).in(
      "player_id",
      (items ?? []).map((i) => i.player_id)
    );
  }

  const newStatus = action === "ACCEPT" ? "ACCEPTED" : action === "REJECT" ? "REJECTED" : "CANCELLED";
  const { error } = await supabase
    .from("trade_offers")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", offerId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/trades");
  revalidatePath("/dashboard/leagues");
  return {};
}
