import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlayers } from "@/lib/data";
import type { SleeperRosterRow } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PosBadge } from "@/components/pos-badge";
import { Button } from "@/components/ui/button";
import { Link2, RefreshCw } from "lucide-react";

type EspnRoster = {
  id: string;
  espn_league_id: string;
  season: number;
  league_name: string;
  team_name: string;
  wins: number;
  losses: number;
  ties: number;
  roster_json: { espn_player_id: string; name: string; pos: string; team: string | null }[];
  synced_at: string;
};

function record(wins: number, losses: number, ties: number) {
  return `${wins}-${losses}${ties > 0 ? `-${ties}` : ""}`;
}

export default async function MyTeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: sleeperRosters }, { data: espnRosters }, players] = await Promise.all([
    supabase.from("sleeper_rosters").select("*").eq("profile_id", user!.id).order("synced_at", { ascending: false }),
    supabase.from("espn_rosters").select("*").eq("profile_id", user!.id).order("synced_at", { ascending: false }),
    getPlayers(),
  ]);
  const playerIds = new Map(players.map((player) => [player.name.toLowerCase(), player.id]));
  const espn = (espnRosters ?? []) as EspnRoster[];
  const sleeper = (sleeperRosters ?? []) as SleeperRosterRow[];
  const hasRosters = espn.length > 0 || sleeper.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Team</h1>
          <p className="text-sm text-muted">Your ESPN and Sleeper fantasy rosters, with Gridiron HQ player data.</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/sync"><RefreshCw className="mr-2 h-4 w-4" />Manage sync</Link>
        </Button>
      </div>

      {!hasRosters ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <Link2 className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">Connect your fantasy team</p>
              <p className="mt-1 text-sm text-muted">Sync a roster from ESPN or Sleeper to see your players here.</p>
            </div>
            <Button asChild><Link href="/dashboard/sync">Connect ESPN or Sleeper</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {espn.map((roster) => (
            <Card key={`espn-${roster.id}`}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {roster.team_name}<Badge variant="outline">{roster.league_name}</Badge><Badge variant="secondary">ESPN · {roster.season}</Badge>
                </CardTitle>
                <CardDescription>{record(roster.wins, roster.losses, roster.ties)} · synced {new Date(roster.synced_at).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {roster.roster_json.map((player) => {
                  const href = playerIds.has(player.name.toLowerCase())
                    ? `/dashboard/players/${playerIds.get(player.name.toLowerCase())}`
                    : "/dashboard/search";
                  return <Link key={player.espn_player_id} href={href} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-border/20">
                    <span className="flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-sm font-medium">{player.name}</span><span className="text-xs text-muted">{player.team ?? "FA"}</span></span>
                    <span className="text-xs text-muted">{playerIds.has(player.name.toLowerCase()) ? "View player" : "Search player"}</span>
                  </Link>;
                })}
                {roster.roster_json.length === 0 && <p className="text-sm text-muted">ESPN returned an empty roster.</p>}
              </CardContent>
            </Card>
          ))}
          {sleeper.map((roster) => (
            <Card key={`sleeper-${roster.id}`}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {roster.team_name ?? "My team"}<Badge variant="outline">{roster.league_name}</Badge><Badge variant="secondary">Sleeper</Badge>
                </CardTitle>
                <CardDescription>{record(roster.wins, roster.losses, roster.ties)} · synced {new Date(roster.synced_at).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {roster.roster_json.map((player) => {
                  const href = playerIds.has(player.name.toLowerCase())
                    ? `/dashboard/players/${playerIds.get(player.name.toLowerCase())}`
                    : "/dashboard/search";
                  return <Link key={player.sleeper_player_id} href={href} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-border/20">
                    <span className="flex items-center gap-2"><PosBadge pos={player.pos} /><span className="text-sm font-medium">{player.name}</span><span className="text-xs text-muted">{player.team ?? "FA"}</span></span>
                    <span className="text-xs text-muted">{playerIds.has(player.name.toLowerCase()) ? "View player" : "Search player"}</span>
                  </Link>;
                })}
                {roster.roster_json.length === 0 && <p className="text-sm text-muted">Empty roster.</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
