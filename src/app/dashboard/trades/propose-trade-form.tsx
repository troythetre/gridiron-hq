"use client";

import { useMemo, useState, useTransition } from "react";
import type { PlayerRow, InjuryRow } from "@/lib/types";
import { evaluateTrade } from "@/lib/scoring";
import { proposeTrade } from "@/app/actions/trades";
import { PosBadge } from "@/components/pos-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowLeftRight } from "lucide-react";

export interface TradeMember {
  id: string;
  teamName: string;
  roster: PlayerRow[];
}

function toTradeInput(p: PlayerRow, injuriesByName: Map<string, InjuryRow>) {
  const injury = injuriesByName.get(p.name);
  return {
    playerId: p.id,
    name: p.name,
    pos: p.pos,
    team: p.team,
    avg_pts: p.avg_pts,
    injuryStatus: (injury?.status as InjuryRow["status"]) ?? null,
    injuryNote: injury?.note ?? undefined,
  };
}

function projectedStarterPoints(roster: PlayerRow[]) {
  const scored = roster.filter((player) => ["QB", "RB", "WR", "TE"].includes(player.pos)).sort((a, b) => b.avg_pts - a.avg_pts);
  const starters: PlayerRow[] = [];
  const take = (position: string, count: number) => {
    for (const player of scored.filter((candidate) => candidate.pos === position && !starters.includes(candidate)).slice(0, count)) {
      starters.push(player);
    }
  };
  take("QB", 1);
  take("RB", 2);
  take("WR", 2);
  take("TE", 1);
  const flex = scored.find((player) => ["RB", "WR", "TE"].includes(player.pos) && !starters.includes(player));
  if (flex) starters.push(flex);
  return Math.round(starters.reduce((sum, player) => sum + player.avg_pts, 0) * 10) / 10;
}

function rosterAfterTrade(roster: PlayerRow[], outgoing: PlayerRow[], incoming: PlayerRow[]) {
  const outgoingIds = new Set(outgoing.map((player) => player.id));
  const current = roster.filter((player) => !outgoingIds.has(player.id));
  const currentIds = new Set(current.map((player) => player.id));
  return [...current, ...incoming.filter((player) => !currentIds.has(player.id))];
}

function PlayerToggleList({
  players,
  selected,
  onToggle,
  injuriesByName,
  emptyLabel,
}: {
  players: PlayerRow[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  injuriesByName: Map<string, InjuryRow>;
  emptyLabel: string;
}) {
  if (players.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }
  return (
    <div className="max-h-56 space-y-1 overflow-y-auto">
      {players.map((p) => {
        const isSelected = selected.has(p.id);
        const injury = injuriesByName.get(p.name);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onToggle(p.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
              isSelected
                ? "border-primary/60 bg-primary/10"
                : "border-transparent hover:bg-border/20"
            )}
          >
            <PosBadge pos={p.pos} />
            <span className="text-sm font-medium">{p.name}</span>
            <span className="text-xs text-muted">{p.team}</span>
            {injury && <span className="text-xs text-danger">{injury.status}</span>}
            <span className="ml-auto text-xs text-muted">{p.avg_pts.toFixed(1)} avg</span>
          </button>
        );
      })}
    </div>
  );
}

export function ProposeTradeForm({
  leagueId,
  myMember,
  otherMembers,
  injuriesByName,
}: {
  leagueId: string;
  myMember: TradeMember;
  otherMembers: TradeMember[];
  injuriesByName: Map<string, InjuryRow>;
}) {
  // Form state
  const [recipientId, setRecipientId] = useState<string>(otherMembers[0]?.id ?? "");
  const [giving, setGiving] = useState<Set<number>>(new Set());
  const [receiving, setReceiving] = useState<Set<number>>(new Set());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const recipient = otherMembers.find((m) => m.id === recipientId);

  // Toggle a player ID in a Set, creating a new Set to trigger re-render.
  function toggle(set: Set<number>, setFn: (s: Set<number>) => void, id: number) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFn(next);
  }

  // Evaluate the trade based on the selected players, memoizing the result for performance.
  const evaluation = useMemo(() => {
    const givingPlayers = myMember.roster.filter((p) => giving.has(p.id));
    const receivingPlayers = (recipient?.roster ?? []).filter((p) => receiving.has(p.id));
    if (givingPlayers.length === 0 && receivingPlayers.length === 0) return null;
    return evaluateTrade(
      givingPlayers.map((p) => toTradeInput(p, injuriesByName)),
      receivingPlayers.map((p) => toTradeInput(p, injuriesByName))
    );
  }, [giving, receiving, myMember.roster, recipient, injuriesByName]);

  const rosterImpact = useMemo(() => {
    if (!recipient || (giving.size === 0 && receiving.size === 0)) return null;
    const givingPlayers = myMember.roster.filter((player) => giving.has(player.id));
    const receivingPlayers = recipient.roster.filter((player) => receiving.has(player.id));
    const myAfter = rosterAfterTrade(myMember.roster, givingPlayers, receivingPlayers);
    const theirAfter = rosterAfterTrade(recipient.roster, receivingPlayers, givingPlayers);
    const myBeforePoints = projectedStarterPoints(myMember.roster);
    const myAfterPoints = projectedStarterPoints(myAfter);
    const theirBeforePoints = projectedStarterPoints(recipient.roster);
    const theirAfterPoints = projectedStarterPoints(theirAfter);
    return {
      mine: { before: myBeforePoints, after: myAfterPoints, change: Math.round((myAfterPoints - myBeforePoints) * 10) / 10 },
      theirs: { before: theirBeforePoints, after: theirAfterPoints, change: Math.round((theirAfterPoints - theirBeforePoints) * 10) / 10 },
      edge: Math.round(((myAfterPoints - myBeforePoints) - (theirAfterPoints - theirBeforePoints)) * 10) / 10,
    };
  }, [giving, receiving, myMember, recipient]);

  // Handle form submission, sending the trade proposal to the server and updating state based on the response.
  function handleSubmit() {
    if (!recipient) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await proposeTrade({
        leagueId,
        proposerMemberId: myMember.id,
        recipientMemberId: recipient.id,
        givingPlayerIds: Array.from(giving),
        receivingPlayerIds: Array.from(receiving),
        note: note.trim() || undefined,
      });
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setGiving(new Set());
        setReceiving(new Set());
        setNote("");
      }
    });
  }

  // If there are no other members in the league, show a message instead of the form.
  if (otherMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Propose a trade</CardTitle>
          <CardDescription>No other teams in this league yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Render the trade proposal form, including player selection, trade evaluation, and submission controls.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Propose a trade</CardTitle>
        <CardDescription>Pick players from both rosters. The fairness read-out updates live.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Trade with</Label>
          <Select
            value={recipientId}
            onValueChange={(v) => {
              setRecipientId(v);
              setReceiving(new Set());
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a team" />
            </SelectTrigger>
            <SelectContent>
              {otherMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.teamName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>You give ({myMember.teamName})</Label>
            <PlayerToggleList
              players={myMember.roster}
              selected={giving}
              onToggle={(id) => toggle(giving, setGiving, id)}
              injuriesByName={injuriesByName}
              emptyLabel="No players on your roster yet."
            />
          </div>
          <div className="space-y-1.5">
            <Label>You get ({recipient?.teamName ?? "—"})</Label>
            <PlayerToggleList
              players={recipient?.roster ?? []}
              selected={receiving}
              onToggle={(id) => toggle(receiving, setReceiving, id)}
              injuriesByName={injuriesByName}
              emptyLabel="That team has no roster yet."
            />
          </div>
        </div>

        {evaluation && (
          <div className="rounded-[var(--radius)] border border-border bg-background/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">
                Giving value <span className="font-semibold text-foreground">{evaluation.givingValue}</span> · Getting
                value <span className="font-semibold text-foreground">{evaluation.receivingValue}</span>
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  evaluation.verdict === "FAIR" && "bg-success/10 text-success",
                  evaluation.verdict === "FAVORS_YOU" && "bg-primary/10 text-primary",
                  evaluation.verdict === "FAVORS_THEM" && "bg-danger/10 text-danger"
                )}
              >
                <ArrowLeftRight className="h-3 w-3" />
                {evaluation.verdict === "FAIR"
                  ? "Fair trade"
                  : evaluation.verdict === "FAVORS_YOU"
                    ? `Favors you by ${Math.abs(evaluation.percentDiff)}%`
                    : `Favors them by ${Math.abs(evaluation.percentDiff)}%`}
              </span>
            </div>
          </div>
        )}

        {rosterImpact && (
          <div className="rounded-[var(--radius)] border border-border bg-background/40 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Roster fit · projected starters</p>
            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted">{myMember.teamName}</p>
                <p className="font-semibold">{rosterImpact.mine.before.toFixed(1)} → {rosterImpact.mine.after.toFixed(1)} pts</p>
                <p className={cn("text-xs", rosterImpact.mine.change >= 0 ? "text-success" : "text-danger")}>
                  {rosterImpact.mine.change >= 0 ? "+" : ""}{rosterImpact.mine.change.toFixed(1)} pts/week
                </p>
              </div>
              <div>
                <p className="text-muted">{recipient?.teamName}</p>
                <p className="font-semibold">{rosterImpact.theirs.before.toFixed(1)} → {rosterImpact.theirs.after.toFixed(1)} pts</p>
                <p className={cn("text-xs", rosterImpact.theirs.change >= 0 ? "text-success" : "text-danger")}>
                  {rosterImpact.theirs.change >= 0 ? "+" : ""}{rosterImpact.theirs.change.toFixed(1)} pts/week
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold text-foreground">
              {Math.abs(rosterImpact.edge) < 0.5
                ? "Similar projected lineup impact for both teams."
                : `${rosterImpact.edge > 0 ? myMember.teamName : recipient?.teamName} gains ${Math.abs(rosterImpact.edge).toFixed(1)} more starter points per week from roster fit.`}
            </p>
            <p className="mt-2 text-[11px] text-muted">Uses each roster&apos;s top projected QB, 2 RB, 2 WR, TE, and FLEX. Bench depth is included when calculating the change.</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="note">Note (optional)</Label>
          <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Say something about the offer" />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">Trade offer sent.</p>}

        <Button
          className="w-full"
          disabled={pending || giving.size === 0 || receiving.size === 0}
          onClick={handleSubmit}
        >
          {pending ? "Sending..." : "Send trade offer"}
        </Button>
      </CardContent>
    </Card>
  );
}
