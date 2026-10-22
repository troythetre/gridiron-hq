import { createClient } from "@/lib/supabase/server";

// Server-only: this file imports the Supabase server client (next/headers),
// so it must never be imported from a "use client" component. The
// client-safe sportsbook metadata (labels/colors/logos) lives in
// src/lib/sportsbook-meta.ts instead - see that file's comment for why
// the split exists.

/** The sportsbook ids a user has tagged as "theirs". This is a plain
 * preference list, not a real account connection - see the migration
 * comment on sportsbook_links for why no credential-based linking is
 * offered. Tolerates the table not existing yet, same as getSavedParlays(). */
export async function getLinkedSportsbooks(profileId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sportsbook_links")
    .select("sportsbook_id")
    .eq("profile_id", profileId);
  if (error?.code === "PGRST205" || error?.code === "42P01") return [];
  if (error) throw error;
  return (data ?? []).map((row) => row.sportsbook_id);
}
