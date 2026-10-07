"use client";

import { useActionState, useState, useTransition } from "react";
import { connectEspnLeague, removeEspnLeague, syncEspnLeague } from "@/app/actions/espn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, RefreshCw, Unlink } from "lucide-react";

const currentSeason = () => { const date = new Date(); return date.getMonth() <= 1 ? date.getFullYear() - 1 : date.getFullYear(); };

export function EspnConnectForm() {
  const [state, formAction, pending] = useActionState(connectEspnLeague, undefined);
  return <Card>
    <CardHeader>
      <CardTitle>Connect ESPN Fantasy</CardTitle>
      <CardDescription>Private league sync uses your ESPN session cookies to find your roster. Cookies are encrypted on the server and never sent back to the browser after submission.</CardDescription>
    </CardHeader>
    <CardContent>
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="espn-league-id">League ID</Label><Input id="espn-league-id" name="leagueId" inputMode="numeric" placeholder="e.g. 12345678" required /></div>
        <div className="space-y-1.5"><Label htmlFor="espn-season">Season</Label><Input id="espn-season" name="season" type="number" defaultValue={currentSeason()} required /></div>
        <div className="space-y-1.5"><Label htmlFor="espn-swid">SWID cookie</Label><Input id="espn-swid" name="swid" autoComplete="off" placeholder="{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}" required /></div>
        <div className="space-y-1.5"><Label htmlFor="espn-s2">espn_s2 cookie</Label><Input id="espn-s2" name="espnS2" type="password" autoComplete="off" required /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="espn-team-id">Team ID <span className="font-normal text-muted">(optional; use if account matching fails)</span></Label><Input id="espn-team-id" name="teamId" inputMode="numeric" placeholder="Leave blank to match your account" /></div>
        {state?.error && <p role="alert" className="text-sm text-danger sm:col-span-2">{state.error}</p>}
        <div className="sm:col-span-2"><Button type="submit" disabled={pending} className="gap-2"><Link2 className="h-4 w-4" />{pending ? "Connecting…" : "Connect ESPN league"}</Button></div>
      </form>
      <p className="mt-4 text-xs leading-5 text-muted">ESPN does not offer a public fantasy sync API. This integration uses ESPN&apos;s unofficial read endpoint and may need updates if ESPN changes it. Get cookies from your browser&apos;s ESPN site data; never share them with anyone.</p>
    </CardContent>
  </Card>;
}

export function EspnRosterControls({ leagueId }: { leagueId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return <div className="flex flex-col items-end gap-1">
    <div className="flex items-center gap-1">
    <Button variant="secondary" size="sm" disabled={pending} className="gap-1.5" onClick={() => { setError(null); startTransition(async () => { const result = await syncEspnLeague(leagueId); setError(result.error ?? null); }); }}><RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />{pending ? "Syncing…" : "Re-sync"}</Button>
    <Button variant="ghost" size="sm" aria-label="Disconnect ESPN league" disabled={pending} onClick={() => startTransition(() => removeEspnLeague(leagueId))}><Unlink className="h-3.5 w-3.5" /></Button>
    </div>
    {error && <span role="alert" className="max-w-52 text-right text-xs text-danger">{error}</span>}
  </div>;
}
