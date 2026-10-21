"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const LegSchema = z.object({
  event: z.string().trim().max(200).default(""),
  selection: z.string().trim().max(200).default(""),
  odds: z.string().trim().max(20).default(""),
  book: z.string().trim().max(60).optional(),
});

const SaveParlaySchema = z.object({
  sport: z.enum(["NFL", "CFB"]),
  stake: z.coerce.number().positive().max(1_000_000),
  combinedOddsDecimal: z.coerce.number().positive().max(1_000_000).optional(),
  potentialPayout: z.coerce.number().nonnegative().max(100_000_000).optional(),
});

/** Saves the parlay currently built in the Parlay Lab to the signed-in bettor's account. */
export async function saveParlay(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = SaveParlaySchema.safeParse({
    sport: formData.get("sport"),
    stake: formData.get("stake"),
    combinedOddsDecimal: formData.get("combinedOddsDecimal") || undefined,
    potentialPayout: formData.get("potentialPayout") || undefined,
  });
  if (!parsed.success) return;

  let rawLegs: unknown;
  try {
    rawLegs = JSON.parse(String(formData.get("legs") ?? "[]"));
  } catch {
    return;
  }
  const legs = z.array(LegSchema).min(1).max(12).safeParse(rawLegs);
  if (!legs.success) return;
  const nonEmptyLegs = legs.data.filter((leg) => leg.event && leg.selection && leg.odds);
  if (nonEmptyLegs.length === 0) return;

  const { error } = await supabase.from("saved_parlays").insert({
    profile_id: user.id,
    sport: parsed.data.sport,
    legs: nonEmptyLegs,
    stake: parsed.data.stake,
    combined_odds_decimal: parsed.data.combinedOddsDecimal ?? null,
    potential_payout: parsed.data.potentialPayout ?? null,
  });
  if (error && error.code !== "PGRST205" && error.code !== "42P01") throw error;

  revalidatePath("/dashboard/account");
}

const StatusSchema = z.enum(["pending", "won", "lost", "void"]);

/** Lets a bettor mark one of their own saved parlays as won/lost/void/pending.
 * There's no live score feed wired up yet, so settlement is manual for now. */
export async function setParlayStatus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parlayId = z.uuid().safeParse(formData.get("parlayId"));
  const status = StatusSchema.safeParse(formData.get("status"));
  if (!parlayId.success || !status.success) return;

  const { data: existing } = await supabase
    .from("saved_parlays")
    .select("profile_id,potential_payout")
    .eq("id", parlayId.data)
    .maybeSingle();
  if (!existing || existing.profile_id !== user.id) return;

  const update: Record<string, unknown> = {
    status: status.data,
    settled_at: status.data === "pending" ? null : new Date().toISOString(),
    actual_payout: status.data === "won" ? existing.potential_payout ?? 0 : status.data === "lost" ? 0 : null,
  };

  await supabase.from("saved_parlays").update(update).eq("id", parlayId.data);
  revalidatePath("/dashboard/account");
}

/** Deletes one of the signed-in bettor's own saved parlays. */
export async function deleteSavedParlay(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parlayId = z.uuid().safeParse(formData.get("parlayId"));
  if (!parlayId.success) return;

  await supabase.from("saved_parlays").delete().eq("id", parlayId.data).eq("profile_id", user.id);
  revalidatePath("/dashboard/account");
}
