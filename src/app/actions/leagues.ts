"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROSTER_SLOTS, SLOT_ELIGIBLE_POS, type RosterSlotName } from "@/lib/types";

function randomInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

const CreateLeagueSchema = z.object({
  leagueName: z.string().min(2).max(60),
  teamName: z.string().min(2).max(40),
  numTeams: z.coerce.number().int().min(4).max(20),
});

export async function createLeague(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = CreateLeagueSchema.safeParse({
    leagueName: formData.get("leagueName"),
    teamName: formData.get("teamName"),
    numTeams: formData.get("numTeams"),
  });
  if (!parsed.success) return { error: "Please fill out every field." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .insert({
      name: parsed.data.leagueName,
      num_teams: parsed.data.numTeams,
      invite_code: randomInviteCode(),
      created_by: user.id,
    })
    .select()
    .single();
  if (leagueError) return { error: leagueError.message };

  const { error: memberError } = await supabase
    .from("league_members")
    .insert({ league_id: league.id, profile_id: user.id, team_name: parsed.data.teamName });
  if (memberError) return { error: memberError.message };

  revalidatePath("/dashboard/leagues");
  redirect(`/dashboard/leagues/${league.id}`);
}

const JoinLeagueSchema = z.object({
  inviteCode: z.string().min(4).max(10),
  teamName: z.string().min(2).max(40),
});

export async function joinLeague(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = JoinLeagueSchema.safeParse({
    inviteCode: formData.get("inviteCode"),
    teamName: formData.get("teamName"),
  });
  if (!parsed.success) return { error: "Please fill out every field." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: league, error: findError } = await supabase
    .from("leagues")
    .select("id")
    .eq("invite_code", parsed.data.inviteCode.toUpperCase())
    .maybeSingle();
  if (findError) return { error: findError.message };
  if (!league) return { error: "No league found with that invite code." };

  const { error: memberError } = await supabase
    .from("league_members")
    .insert({ league_id: league.id, profile_id: user.id, team_name: parsed.data.teamName });
  if (memberError) {
    if (memberError.code === "23505") return { error: "You're already in this league." };
    return { error: memberError.message };
  }

  revalidatePath("/dashboard/leagues");
  redirect(`/dashboard/leagues/${league.id}`);
}

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
