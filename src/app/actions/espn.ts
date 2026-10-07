"use server";

import { z } from "zod"; // Importing the zod library for schema validation
import { revalidatePath } from "next/cache"; // Importing the revalidatePath function from Next.js for cache revalidation
import { redirect } from "next/navigation"; // Importing the redirect function from Next.js for navigation
import { createClient } from "@/lib/supabase/server";
import { currentEspnSeason, decryptEspnCookies, encryptEspnCookies, fetchEspnRoster } from "@/lib/espn";

// Type definition for the state returned by action functions
type ActionState = { error?: string } | undefined;
const ConnectionSchema = z.object({
  leagueId: z.string().trim().min(1).max(20).regex(/^\d+$/, "League ID must be numeric."),
  season: z.coerce.number().int().min(2015).max(currentEspnSeason() + 1),
  swid: z.string().trim().min(30).max(50).regex(/^\{?[\da-f-]{36}\}?$/i, "SWID must be a UUID in braces or without braces."),
  espnS2: z.string().trim().min(20).max(4096),
  teamId: z.string().trim().max(10).regex(/^\d*$/, "Team ID must be numeric.").optional(),
});

// Function to connect to an ESPN league
export async function connectEspnLeague(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ConnectionSchema.safeParse({
    leagueId: formData.get("leagueId"), season: formData.get("season"), swid: formData.get("swid"),
    espnS2: formData.get("espnS2"), teamId: formData.get("teamId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the ESPN connection details." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    const roster = await fetchEspnRoster(parsed.data.leagueId, parsed.data.season, parsed.data.swid, parsed.data.espnS2, parsed.data.teamId);
    const encrypted = encryptEspnCookies({ swid: parsed.data.swid, espnS2: parsed.data.espnS2 });
    const { error: linkError } = await supabase.from("espn_links").upsert({
      // Store the encrypted ESPN cookies and league information in the database
      profile_id: user.id,
      espn_league_id: roster.league_id,
      season: parsed.data.season,
      team_id: parsed.data.teamId ?? null,
      cookie_ciphertext: encrypted.ciphertext,
      cookie_iv: encrypted.iv,
      cookie_tag: encrypted.tag,
      updated_at: new Date().toISOString(),
    }, { onConflict: "profile_id,espn_league_id" });
    if (linkError) return { error: linkError.message };
    const { error: rosterError } = await supabase.from("espn_rosters").upsert({
      profile_id: user.id,
      espn_league_id: roster.league_id,
      league_name: roster.league_name,
      team_name: roster.team_name,
      wins: roster.wins,
      losses: roster.losses,
      ties: roster.ties,
      roster_json: roster.roster_json,
      synced_at: new Date().toISOString(),
    }, { onConflict: "profile_id,espn_league_id" });
    if (rosterError) return { error: rosterError.message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ESPN sync failed." };
  }
  revalidatePath("/dashboard/sync");
  return {};
}

// Function to synchronize the ESPN league data
export async function syncEspnLeague(leagueId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: link, error: linkError } = await supabase.from("espn_links").select("*").eq("profile_id", user.id).eq("espn_league_id", leagueId).maybeSingle();
  if (linkError || !link) return { error: "ESPN connection not found. Reconnect the league." };
  try {
    const cookies = decryptEspnCookies(link);
    const roster = await fetchEspnRoster(link.espn_league_id, link.season, cookies.swid, cookies.espnS2, link.team_id ?? undefined);
    const { error } = await supabase.from("espn_rosters").upsert({
      profile_id: user.id,
      espn_league_id: roster.league_id,
      league_name: roster.league_name,
      team_name: roster.team_name,
      wins: roster.wins,
      losses: roster.losses,
      ties: roster.ties,
      roster_json: roster.roster_json,
      synced_at: new Date().toISOString(),
    }, { onConflict: "profile_id,espn_league_id" });
    if (error) return { error: error.message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ESPN sync failed." };
  }
  revalidatePath("/dashboard/sync");
  return {};
}

// Function to remove an ESPN league connection
export async function removeEspnLeague(leagueId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await Promise.all([
    supabase.from("espn_rosters").delete().eq("profile_id", user.id).eq("espn_league_id", leagueId),
    supabase.from("espn_links").delete().eq("profile_id", user.id).eq("espn_league_id", leagueId),
  ]);
  revalidatePath("/dashboard/sync");
}
