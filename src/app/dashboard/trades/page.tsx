import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getInjuries } from "@/lib/data";
import { evaluateTrade, type InjuryStatus } from "@/lib/scoring";
import type { PlayerRow, TradeOfferStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { TradeBlockPanel, type TradeBlockEntry } from "./trade-block-panel";
import { ProposeTradeForm, type TradeMember } from "./propose-trade-form";
import { TradeOffersList, type OfferView } from "./trade-offers-list";
import { hasActiveMembership } from "@/lib/membership";
import { MembershipWall } from "@/components/membership-wall";
import { TradeCalculator } from "./trade-calculator";
import { getPlayers } from "@/lib/data";

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { league: leagueParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !await hasActiveMembership(user.id, user.email)) return <MembershipWall feature="Trade Calculator" />;

  const { data: memberships } = await supabase
    .from("league_members")
    .select("id, team_name, league_id, leagues(id, name)")
    .eq("profile_id", user!.id);

  if (!memberships || memberships.length === 0) {
    const [{ data: sleeperRosters }, { data: espnRosters }, players, injuries] = await Promise.all([
      supabase.from("sleeper_rosters").select("team_name,league_name,roster_json").eq("profile_id", user.id),
      supabase.from("espn_rosters").select("team_name,league_name,roster_json").eq("profile_id", user.id),
      getPlayers(),
      getInjuries(),
    ]);
    const synced = [
      ...((sleeperRosters ?? []) as { team_name: string | null; league_name: string; roster_json: { name: string }[] }[]),
      ...((espnRosters ?? []) as { team_name: string; league_name: string; roster_json: { name: string }[] }[]),
    ];
    const rosterNames = synced.flatMap((roster) => roster.roster_json.map((player) => player.name));
    const teamNames = [...new Set(synced.map((roster) => `${roster.team_name ?? "My team"} · ${roster.league_name}`))];
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-cyan-500/20 bg-[linear-gradient(135deg,#102936,#10151c_72%)] p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Roster-aware analysis</p>
          <h1 className="mt-2 text-3xl font-black">Trade Calculator</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Compare the player value on each side of a deal. Your synced team players are prioritized automatically.</p>
        </div>
        <TradeCalculator players={players} injuries={injuries} rosterNames={rosterNames} teamNames={teamNames} />
      </div>
    );
  }

  const activeLeagueId = leagueParam ?? memberships[0].league_id;
  const myMembership = memberships.find((m) => m.league_id === activeLeagueId) ?? memberships[0];

  const [{ data: allMembers }, injuries] = await Promise.all([
    supabase
      .from("league_members")
      .select("id, team_name, profile_id")
      .eq("league_id", activeLeagueId),
    getInjuries(),
  ]);
  const injuriesByName = new Map(injuries.map((i) => [i.name, i]));

  const memberIds = (allMembers ?? []).map((m) => m.id);
  const membersById = new Map((allMembers ?? []).map((m) => [m.id, m]));

  const [{ data: rosterRows }, { data: blockRows }, { data: offerRows }] = await Promise.all([
    memberIds.length
      ? supabase.from("roster_slots").select("league_member_id, player_id, players(*)").in("league_member_id", memberIds)
      : Promise.resolve({ data: [] }),
    memberIds.length
      ? supabase.from("trade_block").select("id, league_member_id, player_id, note, players(*)").in("league_member_id", memberIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("trade_offers")
      .select(
        "*, proposer:league_members!trade_offers_proposer_member_id_fkey(id, team_name), recipient:league_members!trade_offers_recipient_member_id_fkey(id, team_name)"
      )
      .eq("league_id", activeLeagueId)
      .or(`proposer_member_id.eq.${myMembership.id},recipient_member_id.eq.${myMembership.id}`)
      .order("created_at", { ascending: false }),
  ]);

  const rosterByMember = new Map<string, PlayerRow[]>();
  for (const row of rosterRows ?? []) {
    const player = Array.isArray(row.players) ? row.players[0] : row.players;
    if (!player) continue;
    const list = rosterByMember.get(row.league_member_id) ?? [];
    list.push(player as PlayerRow);
    rosterByMember.set(row.league_member_id, list);
  }

  const tradeBlockEntries: TradeBlockEntry[] = (blockRows ?? [])
    .map((row) => {
      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      const member = membersById.get(row.league_member_id);
      if (!player || !member) return null;
      return {
        id: row.id,
        leagueMemberId: row.league_member_id,
        teamName: member.team_name,
        player: player as PlayerRow,
        note: row.note,
        isMine: row.league_member_id === myMembership.id,
      };
    })
    .filter((e): e is TradeBlockEntry => e !== null);

  const otherMembers: TradeMember[] = (allMembers ?? [])
    .filter((m) => m.id !== myMembership.id)
    .map((m) => ({ id: m.id, teamName: m.team_name, roster: rosterByMember.get(m.id) ?? [] }));

  const myMember: TradeMember = {
    id: myMembership.id,
    teamName: myMembership.team_name,
    roster: rosterByMember.get(myMembership.id) ?? [],
  };

  // Fetch items for the offers we loaded, then assemble the fairness-evaluated view.
  const offerIds = (offerRows ?? []).map((o) => o.id);
  const { data: itemRows } = offerIds.length
    ? await supabase.from("trade_offer_items").select("trade_offer_id, player_id, from_member_id, players(*)").in("trade_offer_id", offerIds)
    : { data: [] };

  const itemsByOffer = new Map<string, { playerRow: PlayerRow; fromMemberId: string }[]>();
  for (const item of itemRows ?? []) {
    const player = Array.isArray(item.players) ? item.players[0] : item.players;
    if (!player) continue;
    const list = itemsByOffer.get(item.trade_offer_id) ?? [];
    list.push({ playerRow: player as PlayerRow, fromMemberId: item.from_member_id });
    itemsByOffer.set(item.trade_offer_id, list);
  }

  function toTradeInput(p: PlayerRow) {
    const injury = injuriesByName.get(p.name);
    return {
      playerId: p.id,
      name: p.name,
      pos: p.pos,
      team: p.team,
      avg_pts: p.avg_pts,
      injuryStatus: (injury?.status as InjuryStatus) ?? null,
      injuryNote: injury?.note ?? undefined,
    };
  }

  const offers: OfferView[] = (offerRows ?? []).map((offer) => {
    const proposer = Array.isArray(offer.proposer) ? offer.proposer[0] : offer.proposer;
    const recipient = Array.isArray(offer.recipient) ? offer.recipient[0] : offer.recipient;
    const items = itemsByOffer.get(offer.id) ?? [];
    const proposerGives = items.filter((i) => i.fromMemberId === proposer?.id).map((i) => i.playerRow);
    const recipientGives = items.filter((i) => i.fromMemberId === recipient?.id).map((i) => i.playerRow);
    const evaluation = evaluateTrade(proposerGives.map(toTradeInput), recipientGives.map(toTradeInput));

    return {
      id: offer.id,
      status: offer.status as TradeOfferStatus,
      note: offer.note,
      createdAt: offer.created_at,
      proposerTeamName: proposer?.team_name ?? "Unknown",
      recipientTeamName: recipient?.team_name ?? "Unknown",
      isProposer: offer.proposer_member_id === myMembership.id,
      proposerGives: proposerGives.map((p) => ({ id: p.id, name: p.name, pos: p.pos })),
      recipientGives: recipientGives.map((p) => ({ id: p.id, name: p.name, pos: p.pos })),
      givingValue: evaluation.givingValue,
      receivingValue: evaluation.receivingValue,
      verdict: evaluation.verdict,
      percentDiff: evaluation.percentDiff,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trades</h1>
        <p className="text-sm text-muted">
          List players, propose trades, and see a transparent fairness read-out before anyone commits.
        </p>
      </div>

      {memberships.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {memberships.map((m) => {
            const league = Array.isArray(m.leagues) ? m.leagues[0] : m.leagues;
            return (
              <Link key={m.id} href={`/dashboard/trades?league=${m.league_id}`}>
                <Badge variant={m.league_id === activeLeagueId ? "default" : "outline"}>
                  {league?.name ?? m.team_name}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TradeBlockPanel entries={tradeBlockEntries} myMemberId={myMembership.id} myRoster={myMember.roster} />
        <ProposeTradeForm
          leagueId={activeLeagueId}
          myMember={myMember}
          otherMembers={otherMembers}
          injuriesByName={injuriesByName}
        />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold uppercase tracking-wide text-muted">
          Your trade offers
        </h2>
        <TradeOffersList offers={offers} />
      </div>
    </div>
  );
}
