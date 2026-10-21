"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SportsbookIdSchema = z.string().trim().min(1).max(60);

/** Tags a sportsbook as "mine" for the signed-in user. This is a
 * preference marker only - no credentials are collected and nothing is
 * synced from the sportsbook's real site. See the sportsbook_links
 * migration for why real account linking isn't offered. */
export async function linkSportsbook(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sportsbookId = SportsbookIdSchema.safeParse(formData.get("sportsbookId"));
  if (!sportsbookId.success) return;

  const { error } = await supabase.from("sportsbook_links").insert({
    profile_id: user.id,
    sportsbook_id: sportsbookId.data.toLowerCase(),
  });
  // Ignore unique-violation (already linked) and missing-table errors the
  // same way the parlay actions tolerate a not-yet-migrated environment.
  if (error && error.code !== "23505" && error.code !== "PGRST205" && error.code !== "42P01") throw error;

  revalidatePath("/dashboard/parlay");
}

/** Removes a sportsbook the user previously tagged as "mine". */
export async function unlinkSportsbook(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sportsbookId = SportsbookIdSchema.safeParse(formData.get("sportsbookId"));
  if (!sportsbookId.success) return;

  await supabase
    .from("sportsbook_links")
    .delete()
    .eq("profile_id", user.id)
    .eq("sportsbook_id", sportsbookId.data.toLowerCase());

  revalidatePath("/dashboard/parlay");
}
