"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getSleeperUser,
  getLeagueRosters,
  getLeagueUsers,
  getAllPlayers,
  normalizeSleeperPos,
  sleeperPlayerName,
  SleeperApiError,
} from "@/lib/sleeper";
import type { SleeperRosterPlayer } from "@/lib/types";

type ActionState = { error?: string } | undefined;

const UsernameSchema = z.object({
  username: z.string().min(2, "Enter your Sleeper username").max(39),
});

export async function linkSleeperAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = UsernameSchema.safeParse({ username: formData.get("username") });
  if (!parsed.success) return { error: "Enter a valid Sleeper username." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let sleeperUser;
  try {
    sleeperUser = await getSleeperUser(parsed.data.username);
  } catch (e) {
    return { error: e instanceof SleeperApiError ? e.message : "Couldn't find that Sleeper username." };
  }

  const { error } = await supabase
    .from("sleeper_links")
    .upsert(
      {
        profile_id: user.id,
        sleeper_username: sleeperUser.username,
        sleeper_user_id: sleeperUser.user_id,
        avatar: sleeperUser.avatar,
      },
      { onConflict: "profile_id" }
    );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/sync");
  return { error: undefined };
}

export async function unlinkSleeperAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("sleeper_rosters").delete().eq("profile_id", user.id);
  await supabase.from("sleeper_links").delete().eq("profile_id", user.id);

  revalidatePath("/dashboard/sync");
}

export async function syncSleeperLeague(sleeperLeagueId: string, leagueName: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: link } = await supabase
    .from("sleeper_links")
    .select("sleeper_user_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!link) return { error: "Link your Sleeper account first." };

  let rosters, leagueUsers, players;
  try {
    [rosters, leagueUsers, players] = await Promise.all([
      getLeagueRosters(sleeperLeagueId),
      getLeagueUsers(sleeperLeagueId),
      getAllPlayers(),
    ]);
  } catch (e) {
    return { error: e instanceof SleeperApiError ? e.message : "Sync failed. Try again." };
  }

  const myRoster = rosters.find((r) => r.owner_id === link.sleeper_user_id);
  if (!myRoster) return { error: "Couldn't find your roster in that league." };

  const myUserInfo = leagueUsers.find((u) => u.user_id === link.sleeper_user_id);
  const teamName = myUserInfo?.metadata?.team_name ?? myUserInfo?.display_name ?? null;

  const rosterPlayers: SleeperRosterPlayer[] = (myRoster.players ?? []).map((pid) => ({
    sleeper_player_id: pid,
    name: sleeperPlayerName(pid, players[pid]),
    pos: normalizeSleeperPos(players[pid]?.position),
    team: players[pid]?.team ?? null,
  }));

  const { error } = await supabase.from("sleeper_rosters").upsert(
    {
      profile_id: user.id,
      sleeper_league_id: sleeperLeagueId,
      league_name: leagueName,
      team_name: teamName,
      wins: myRoster.settings?.wins ?? 0,
      losses: myRoster.settings?.losses ?? 0,
      ties: myRoster.settings?.ties ?? 0,
      roster_json: rosterPlayers,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,sleeper_league_id" }
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/sync");
  return {};
}

export async function removeSleeperRoster(rosterRowId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("sleeper_rosters").delete().eq("id", rosterRowId).eq("profile_id", user.id);
  revalidatePath("/dashboard/sync");
}
