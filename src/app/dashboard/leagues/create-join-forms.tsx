"use client";

import { useActionState } from "react";
import { createLeague, joinLeague } from "@/app/actions/leagues";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// Form for creating or joining a league
export function CreateLeagueForm() {
  const [state, formAction, pending] = useActionState(createLeague, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a league</CardTitle>
        <CardDescription>You&apos;ll get an invite code to share with the rest of your league.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="leagueName">League name</Label>
            <Input id="leagueName" name="leagueName" placeholder="League 2" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teamName">Your team name</Label>
            <Input id="teamName" name="teamName" placeholder="Shiva Explosions" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="numTeams">Number of teams</Label>
            <Input id="numTeams" name="numTeams" type="number" defaultValue={10} min={4} max={20} required />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating..." : "Create league"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function JoinLeagueForm() {
  const [state, formAction, pending] = useActionState(joinLeague, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Join a league</CardTitle>
        <CardDescription>Ask the commissioner for the 6-character invite code.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="inviteCode">Invite code</Label>
            <Input id="inviteCode" name="inviteCode" placeholder="AB12CD" className="uppercase" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teamNameJoin">Your team name</Label>
            <Input id="teamNameJoin" name="teamName" placeholder="My Team" required />
          </div>
          {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
            {pending ? "Joining..." : "Join league"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
