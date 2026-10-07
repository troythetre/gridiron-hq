import { createClient } from "@/lib/supabase/server";
import { getPlayers, getInjuries } from "@/lib/data";
import { getUserLeagues, SleeperApiError, type SleeperLeague } from "@/lib/sleeper";
import type { SleeperRosterRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Badge } from "@/components/ui/badge";
import {
  LinkSleeperForm,
  LinkedAccountBar,
  SleeperLeagueList,
  RemoveRosterButton,
} from "./sleeper-sync-client";
import { Link2 } from "lucide-react";

export default async function SyncPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: link }, { data: syncedRosters }, players, injuries] = await Promise.all([
    supabase.from("sleeper_links").select("*").eq("profile_id", user!.id).maybeSingle(),
    supabase
      .from("sleeper_rosters")
      .select("*")
      .eq("profile_id", user!.id)
      .order("synced_at", { ascending: false }),
    getPlayers(),
    getInjuries(),
  ]);

  const playersByName = new Map(players.map((p) => [p.name.toLowerCase(), p]));
  const injuriesByNameLower = new Map(injuries.map((i) => [i.name.toLowerCase(), i]));

  let leagues: SleeperLeague[] = [];
  let fetchError: string | undefined;
  if (link) {
    try {
      leagues = await getUserLeagues(link.sleeper_user_id);
    } catch (e) {
      fetchError = e instanceof SleeperApiError ? e.message : "Couldn't load your Sleeper leagues.";
    }
  }

  const syncedLeagueIds = new Set((syncedRosters ?? []).map((r) => r.sleeper_league_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sync</h1>
        <p className="text-sm text-muted">
          Connect your Sleeper account to see a real roster next to your Gridiron HQ data. ESPN and
          NFL Fantasy sync are coming later - both require pasting a private session cookie since
          neither has a public API, so they&apos;ll ship as a clearly-labeled advanced option.
        </p>
      </div>

      {!link ? (
        <LinkSleeperForm />
      ) : (
        <div className="space-y-4">
          <LinkedAccountBar username={link.sleeper_username} />

          <Card>
            <CardHeader>
              <CardTitle>Your Sleeper leagues ({new Date().getFullYear()} season)</CardTitle>
              <CardDescription>Pick a league to pull your roster in as reference.</CardDescription>
            </CardHeader>
            <CardContent>
              <SleeperLeagueList leagues={leagues} syncedLeagueIds={syncedLeagueIds} fetchError={fetchError} />
            </CardContent>
          </Card>
        </div>
      )}

      {syncedRosters && syncedRosters.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-muted">
            Synced rosters
          </h2>
          {syncedRosters.map((roster: SleeperRosterRow) => (
            <Card key={roster.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {roster.team_name ?? "My team"}
                    <Badge variant="outline">{roster.league_name}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {roster.wins}-{roster.losses}{roster.ties > 0 ? `-${roster.ties}` : ""} · synced{" "}
                    {new Date(roster.synced_at).toLocaleString()}
                  </CardDescription>
                </div>
                <RemoveRosterButton rosterId={roster.id} />
              </CardHeader>
              <CardContent className="space-y-1.5">
                {roster.roster_json.length === 0 && (
                  <p className="text-sm text-muted">Empty roster.</p>
                )}
                {roster.roster_json.map((p) => {
                  const match = playersByName.get(p.name.toLowerCase());
                  const injury = injuriesByNameLower.get(p.name.toLowerCase());
                  return (
                    <div
                      key={p.sleeper_player_id}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-border/20"
                    >
                      <div className="flex items-center gap-2">
                        <PosBadge pos={p.pos} />
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted">{p.team ?? "FA"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {injury && <StatusBadge status={injury.status} />}
                        {match ? (
                          <span className="text-sm text-muted">{match.avg_pts.toFixed(1)} avg</span>
                        ) : (
                          <span className="text-xs text-muted">no local data</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!link && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm text-muted">
            <Link2 className="h-4 w-4 shrink-0" />
            Synced rosters are read-only reference data. Trades, the trade block, and trade
            recommendations only work on leagues created natively here, since those are the only
            rosters Gridiron HQ actually controls.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
