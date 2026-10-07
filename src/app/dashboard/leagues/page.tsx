import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Users2, ArrowRight, Link2 } from "lucide-react";

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
        <p className="text-sm text-muted">Your fantasy teams and rosters.</p>
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
                          {league.name} · {league.num_teams} teams
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

      {(!memberships || memberships.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <Link2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Bring in a team you already play with</p>
              <p className="mt-1 text-sm text-muted">
                Sync a Sleeper or ESPN roster to keep your team details alongside your fantasy tools.
              </p>
            </div>
            <Link href="/dashboard/sync" className="text-sm font-medium text-primary hover:underline">
              Sync an existing roster <span aria-hidden="true">→</span>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
