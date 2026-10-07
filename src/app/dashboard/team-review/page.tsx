import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getInjuries } from "@/lib/data";
import { tradeValue, type InjuryStatus } from "@/lib/scoring";
import type { PlayerRow, Position } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { cn } from "@/lib/utils";
import { Users2, TrendingDown, TrendingUp, ShieldAlert, Target } from "lucide-react";

const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];
const WEAKNESS_THRESHOLD = -1.5; // pts/game below league average counts as a weak spot

export default async function TeamReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { league: leagueParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("id, team_name, league_id, leagues(id, name)")
    .eq("profile_id", user!.id);

  if (!memberships || memberships.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Review</h1>
          <p className="text-sm text-muted">A positional breakdown of your roster vs the rest of your league.</p>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted">
            <Users2 className="h-5 w-5 shrink-0" />
            You&apos;re not in a league yet.{" "}
            <Link href="/dashboard/leagues" className="text-primary underline-offset-4 hover:underline">
              Create or join one
            </Link>{" "}
            to get a team review.
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeLeagueId = leagueParam ?? memberships[0].league_id;
  const myMembership = memberships.find((m) => m.league_id === activeLeagueId) ?? memberships[0];

  const [{ data: allMembers }, injuries] = await Promise.all([
    supabase.from("league_members").select("id, team_name, profile_id").eq("league_id", activeLeagueId),
    getInjuries(),
  ]);
  const injuriesByName = new Map(injuries.map((i) => [i.name, i]));
  const memberIds = (allMembers ?? []).map((m) => m.id);
  const membersById = new Map((allMembers ?? []).map((m) => [m.id, m]));

  const [{ data: rosterRows }, { data: blockRows }] = await Promise.all([
    memberIds.length
      ? supabase.from("roster_slots").select("league_member_id, slot, players(*)").in("league_member_id", memberIds)
      : Promise.resolve({ data: [] }),
    memberIds.length
      ? supabase.from("trade_block").select("league_member_id, player_id, note, players(*)").in("league_member_id", memberIds)
      : Promise.resolve({ data: [] }),
  ]);

  const rosterByMember = new Map<string, PlayerRow[]>();
  const filledSlotsByMember = new Map<string, number>();
  for (const row of rosterRows ?? []) {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    filledSlotsByMember.set(row.league_member_id, (filledSlotsByMember.get(row.league_member_id) ?? 0) + 1);
    if (!player) continue;
    const list = rosterByMember.get(row.league_member_id) ?? [];
    list.push(player as PlayerRow);
    rosterByMember.set(row.league_member_id, list);
  }

  const myRoster = rosterByMember.get(myMembership.id) ?? [];
  const myFilledSlots = filledSlotsByMember.get(myMembership.id) ?? 0;

  // Positional strength: total avg_pts/game at each position, me vs the league average team.
  const positionRows = POSITIONS.map((pos) => {
    const perMemberTotals = memberIds.map((id) => {
      const roster = rosterByMember.get(id) ?? [];
      return roster.filter((p) => p.pos === pos).reduce((sum, p) => sum + p.avg_pts, 0);
    });
    const leagueAvg = perMemberTotals.length ? perMemberTotals.reduce((a, b) => a + b, 0) / perMemberTotals.length : 0;
    const myTotal = myRoster.filter((p) => p.pos === pos).reduce((sum, p) => sum + p.avg_pts, 0);
    const delta = Math.round((myTotal - leagueAvg) * 10) / 10;
    return { pos, myTotal: Math.round(myTotal * 10) / 10, leagueAvg: Math.round(leagueAvg * 10) / 10, delta };
  });

  const weakPositions = positionRows.filter((r) => r.delta < WEAKNESS_THRESHOLD || r.myTotal === 0).map((r) => r.pos);

  const myInjuredPlayers = myRoster
    .map((p) => ({ player: p, injury: injuriesByName.get(p.name) }))
    .filter((x) => x.injury);

  // Trade recommendations: other teams' trade-block listings at a position I'm weak in,
  // ranked by trade value (production, positional scarcity, and injury discount).
  const recommendations = (blockRows ?? [])
    .map((row) => {
      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      const member = membersById.get(row.league_member_id);
      if (!player || !member || row.league_member_id === myMembership.id) return null;
      if (!weakPositions.includes(player.pos)) return null;
      const injury = injuriesByName.get(player.name);
      const valued = tradeValue({
        playerId: player.id,
        name: player.name,
        pos: player.pos,
        team: player.team,
        avg_pts: player.avg_pts,
        injuryStatus: (injury?.status as InjuryStatus) ?? null,
        injuryNote: injury?.note ?? undefined,
      });
      return { valued, teamName: member.team_name, note: row.note };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.valued.value - a.valued.value)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Review</h1>
        <p className="text-sm text-muted">{myMembership.team_name} vs the rest of the league.</p>
      </div>

      {memberships.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {memberships.map((m) => {
            const league = Array.isArray(m.leagues) ? m.leagues[0] : m.leagues;
            return (
              <Link key={m.id} href={`/dashboard/team-review?league=${m.league_id}`}>
                <Badge variant={m.league_id === activeLeagueId ? "default" : "outline"}>
                  {league?.name ?? m.team_name}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Positional strength</CardTitle>
            <CardDescription>Your total avg pts/game at each position vs the league-average team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {positionRows.map((r) => {
              const max = Math.max(r.myTotal, r.leagueAvg, 1);
              const isWeak = weakPositions.includes(r.pos);
              return (
                <div key={r.pos} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <PosBadge pos={r.pos} />
                      {isWeak && <ShieldAlert className="h-3.5 w-3.5 text-danger" />}
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1 font-medium",
                        r.delta > 0 ? "text-success" : r.delta < 0 ? "text-danger" : "text-muted"
                      )}
                    >
                      {r.delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : r.delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                      {r.myTotal} vs {r.leagueAvg} avg ({r.delta > 0 ? "+" : ""}
                      {r.delta})
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-border/40">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-border"
                      style={{ width: `${(r.leagueAvg / max) * 100}%` }}
                    />
                    <div
                      className={cn("absolute inset-y-0 left-0 rounded-full", isWeak ? "bg-danger" : "bg-primary")}
                      style={{ width: `${(r.myTotal / max) * 100}%`, opacity: 0.85 }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-xs text-muted">
              Bar shows your total vs the thin league-average marker behind it. Red flags a position more than{" "}
              {Math.abs(WEAKNESS_THRESHOLD)} pts/game below average, or empty.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Roster completeness</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{myFilledSlots}/11</p>
              <p className="text-sm text-muted">slots filled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Injury exposure</CardTitle>
              <CardDescription>Rostered players with an active injury status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {myInjuredPlayers.length === 0 && <p className="text-sm text-muted">No injury exposure right now.</p>}
              {myInjuredPlayers.map(({ player, injury }) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PosBadge pos={player.pos} />
                    <span className="text-sm font-medium">{player.name}</span>
                  </div>
                  <StatusBadge status={injury!.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Recommended trade targets
          </CardTitle>
          <CardDescription>
            Players on other teams&apos; trade blocks at your weakest positions, ranked by trade value.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {weakPositions.length === 0 && (
            <p className="text-sm text-muted">No clear weaknesses - your roster is balanced across positions.</p>
          )}
          {weakPositions.length > 0 && recommendations.length === 0 && (
            <p className="text-sm text-muted">
              No one has listed a player at {weakPositions.join(", ")} yet. Check back as the trade block fills up.
            </p>
          )}
          {recommendations.map((r) => (
            <div
              key={`${r.valued.playerId}-${r.teamName}`}
              className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-background/30 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <PosBadge pos={r.valued.pos} />
                <span className="text-sm font-medium">{r.valued.name}</span>
                <span className="text-xs text-muted">from {r.teamName}</span>
                {r.note && <span className="text-xs italic text-muted">&quot;{r.note}&quot;</span>}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{r.valued.value} value</p>
                <p className="text-xs text-muted">{r.valued.reasons[0]}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-sm text-muted">
          <p className="font-medium text-foreground">How this works</p>
          <p className="mt-1">
            Positional strength sums avg pts/game at each position across your whole roster and compares it to the
            average team in your league. Trade targets are pulled only from positions where you&apos;re below that
            average (or empty), then ranked with the same transparent trade-value formula shown on every offer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
