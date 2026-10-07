import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { CreateLeagueForm, JoinLeagueForm } from "./create-join-forms";
import { Users2, ArrowRight } from "lucide-react";

export default async function LeaguesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("id, team_name, league:leagues(id, name, num_teams, invite_code)")
    .eq("profile_id", user!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Team</h1>
        <p className="text-sm text-muted">Your leagues, rosters, and lineups.</p>
      </div>

      {memberships && memberships.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {memberships.map((m) => {
            const league = Array.isArray(m.league) ? m.league[0] : m.league;
            if (!league) return null;
            return (
              <Link key={m.id} href={`/dashboard/leagues/${league.id}`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-3">
                      <Users2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-semibold">{m.team_name}</p>
                        <p className="text-sm text-muted">
                          {league.name} · {league.num_teams} teams · code {league.invite_code}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CreateLeagueForm />
        <JoinLeagueForm />
      </div>
    </div>
  );
}
