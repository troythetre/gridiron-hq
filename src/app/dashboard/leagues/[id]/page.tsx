import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlayers } from "@/lib/data";
import { ROSTER_SLOTS, type PlayerRow, type RosterSlotRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RosterEditor, type SlotAssignment } from "./roster-editor";
import { Badge } from "@/components/ui/badge";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: league } = await supabase.from("leagues").select("*").eq("id", id).maybeSingle();
  if (!league) notFound();

  const { data: members } = await supabase
    .from("league_members")
    .select("id, team_name, profile_id, profiles(display_name)")
    .eq("league_id", id);

  const myMembership = members?.find((m) => m.profile_id === user?.id);

  const { data: rosterSlots } = myMembership
    ? await supabase
        .from("roster_slots")
        .select("*")
        .eq("league_member_id", myMembership.id)
    : { data: [] as RosterSlotRow[] };

  const allPlayers = await getPlayers();
  const playersById = new Map(allPlayers.map((p) => [p.id, p]));

  const assignments: SlotAssignment[] = ROSTER_SLOTS.map((slot) => {
    const row = (rosterSlots ?? []).find((r) => r.slot === slot);
    const player: PlayerRow | null = row ? playersById.get(row.player_id) ?? null : null;
    return { slot, player };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="text-sm text-muted">
            {league.num_teams} teams · {league.scoring_type.replace("_", " ")} scoring
          </p>
        </div>
        <Badge variant="secondary">Invite code: {league.invite_code}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your roster</CardTitle>
            <CardDescription>
              {myMembership
                ? "Assign a player to each slot. Positions are validated against the slot."
                : "You're not a member of this league."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myMembership ? (
              <RosterEditor
                leagueMemberId={myMembership.id}
                assignments={assignments}
                allPlayers={allPlayers}
                editable
              />
            ) : (
              <p className="text-sm text-muted">Join this league from the My Team page to build a roster.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teams in this league</CardTitle>
            <CardDescription>{members?.length ?? 0} of {league.num_teams} spots filled</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {members?.map((m) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              return (
                <div key={m.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-border/20">
                  <span className="text-sm font-medium">{m.team_name}</span>
                  <span className="text-xs text-muted">{profile?.display_name ?? "—"}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
