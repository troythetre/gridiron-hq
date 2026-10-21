"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { PLAYER_LIST_TYPES, type PlayerListType } from "@/lib/player-lists";

const ListTypeSchema = z.enum(PLAYER_LIST_TYPES as [PlayerListType, ...PlayerListType[]]);

/**
 * Best-effort server mirror of a localStorage toggle in player-favorites.ts /
 * player-targets.ts / player-watch.ts. The browser list stays the fast,
 * optimistic source of truth for the UI; this just keeps a server-side copy
 * in sync so the betting profile can be shown to other people. Called
 * fire-and-forget from those client modules - failures here (signed out,
 * table not migrated yet, offline) are swallowed on purpose so they never
 * block or roll back the local toggle the user already saw happen.
 */
export async function syncPlayerListEntry(listType: string, playerId: number, present: boolean) {
  const parsedListType = ListTypeSchema.safeParse(listType);
  const parsedPlayerId = z.number().int().positive().safeParse(playerId);
  if (!parsedListType.success || !parsedPlayerId.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (present) {
    const { error } = await supabase.from("player_list_entries").upsert(
      { profile_id: user.id, list_type: parsedListType.data, player_id: parsedPlayerId.data },
      { onConflict: "profile_id,list_type,player_id", ignoreDuplicates: true },
    );
    if (error && error.code !== "PGRST205" && error.code !== "42P01") return;
  } else {
    await supabase
      .from("player_list_entries")
      .delete()
      .eq("profile_id", user.id)
      .eq("list_type", parsedListType.data)
      .eq("player_id", parsedPlayerId.data);
  }

  revalidatePath("/dashboard/account");
}

const VisibilitySchema = z.object({ isPublic: z.coerce.boolean() });

/** Lets a signed-in bettor flip their betting profile between public and private. */
export async function setBettingProfileVisibility(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const parsed = VisibilitySchema.safeParse({ isPublic: formData.get("isPublic") });
  if (!parsed.success) return;

  await supabase
    .from("profiles")
    .update({ betting_profile_public: parsed.data.isPublic })
    .eq("id", user.id);

  revalidatePath("/dashboard/account");
  revalidatePath(`/dashboard/bettor/${user.id}`);
}
