import { createClient } from "@/lib/supabase/server";
import type { SavedParlayRow } from "@/lib/types";

// Server-only: this file imports the Supabase server client (next/headers),
// so it must never be imported from a "use client" component. Display
// helpers and stat math that a client component needs live in
// src/lib/parlay-format.ts instead.

/** A bettor's saved parlays, most recently placed first. */
export async function getSavedParlays(profileId: string): Promise<SavedParlayRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_parlays")
    .select("*")
    .eq("profile_id", profileId)
    .order("placed_at", { ascending: false });
  // Tolerate the table not existing yet (migration not applied in this environment)
  // the same way getFantasyVideos() does, rather than taking down the account page.
  if (error?.code === "PGRST205" || error?.code === "42P01") return [];
  if (error) throw error;
  return data ?? [];
}
