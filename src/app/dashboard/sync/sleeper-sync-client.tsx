"use client";

import { useActionState, useState, useTransition } from "react";
import {
  linkSleeperAccount,
  unlinkSleeperAccount,
  syncSleeperLeague,
  removeSleeperRoster,
} from "@/app/actions/sleeper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, Unlink, RefreshCw } from "lucide-react";
import type { SleeperLeague } from "@/lib/sleeper";

export function LinkSleeperForm() {
  const [state, formAction, pending] = useActionState(linkSleeperAccount, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Sleeper</CardTitle>
        <CardDescription>
          Pull in your real Sleeper roster as reference, cross-checked against our rankings and injury data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="username">Sleeper username</Label>
            <Input id="username" name="username" placeholder="e.g. troythetre" required />
          </div>
          {state?.error && <p className="text-sm text-danger sm:hidden">{state.error}</p>}
          <Button type="submit" disabled={pending} className="gap-2">
            <Link2 className="h-4 w-4" /> {pending ? "Connecting..." : "Connect"}
          </Button>
        </form>
        {state?.error && <p className="mt-2 hidden text-sm text-danger sm:block">{state.error}</p>}
      </CardContent>
    </Card>
  );
}

export function LinkedAccountBar({ username }: { username: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="success">Connected</Badge>
        <span className="font-medium">@{username}</span>
        <span className="text-muted">on Sleeper</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted"
        disabled={pending}
        onClick={() => startTransition(() => unlinkSleeperAccount())}
      >
        <Unlink className="h-3.5 w-3.5" /> Disconnect
      </Button>
    </div>
  );
}

export function SleeperLeagueList({
  leagues,
  syncedLeagueIds,
  fetchError,
}: {
  leagues: SleeperLeague[];
  syncedLeagueIds: Set<string>;
  fetchError?: string;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (fetchError) {
    return <p className="text-sm text-danger">{fetchError}</p>;
  }
  if (leagues.length === 0) {
    return <p className="text-sm text-muted">No Sleeper leagues found for this season.</p>;
  }

  function handleSync(league: SleeperLeague) {
    setError(null);
    setPendingId(league.league_id);
    startTransition(async () => {
      const res = await syncSleeperLeague(league.league_id, league.name);
      if (res?.error) setError(res.error);
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-danger">{error}</p>}
      {leagues.map((l) => {
        const synced = syncedLeagueIds.has(l.league_id);
        return (
          <div
            key={l.league_id}
            className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-surface px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{l.name}</p>
              <p className="text-xs text-muted">{l.total_rosters} teams · {l.season} season</p>
            </div>
            <Button
              variant={synced ? "secondary" : "default"}
              size="sm"
              className="gap-1.5"
              disabled={pendingId === l.league_id}
              onClick={() => handleSync(l)}
            >
              <RefreshCw className={pendingId === l.league_id ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
              {pendingId === l.league_id ? "Syncing..." : synced ? "Re-sync" : "Sync roster"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function RemoveRosterButton({ rosterId }: { rosterId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted"
      disabled={pending}
      onClick={() => startTransition(() => removeSleeperRoster(rosterId))}
    >
      Remove
    </Button>
  );
}
