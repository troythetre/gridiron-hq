"use client";

import { useState } from "react";
import { Dices, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Small, fixed sample game logs so this demo is self-contained and doesn't
// depend on any real person's data. The shape matches RawGameLog in
// src/lib/ml/featureEngine.ts exactly, so this is a live call into that
// code path, not a mock of it.
const TEAM_A = [
  { name: "A1 - WR1", history: [
    { playerId: "a1", fantasyPoints: 18.4, targets: 9, snapPct: 0.84, oppDefRank: 22, vegasImpliedTotal: 24.5 },
    { playerId: "a1", fantasyPoints: 14.1, targets: 7, snapPct: 0.81, oppDefRank: 11, vegasImpliedTotal: 21.0 },
    { playerId: "a1", fantasyPoints: 21.6, targets: 11, snapPct: 0.88, oppDefRank: 29, vegasImpliedTotal: 26.5 },
  ] },
  { name: "A2 - RB1", history: [
    { playerId: "a2", fantasyPoints: 12.2, targets: 3, snapPct: 0.62, oppDefRank: 18, vegasImpliedTotal: 24.5 },
    { playerId: "a2", fantasyPoints: 9.8, targets: 2, snapPct: 0.58, oppDefRank: 9, vegasImpliedTotal: 21.0 },
    { playerId: "a2", fantasyPoints: 16.4, targets: 4, snapPct: 0.67, oppDefRank: 24, vegasImpliedTotal: 26.5 },
  ] },
  { name: "A3 - TE1", history: [
    { playerId: "a3", fantasyPoints: 7.5, targets: 4, snapPct: 0.71, oppDefRank: 18, vegasImpliedTotal: 24.5 },
    { playerId: "a3", fantasyPoints: 5.9, targets: 3, snapPct: 0.69, oppDefRank: 9, vegasImpliedTotal: 21.0 },
    { playerId: "a3", fantasyPoints: 11.2, targets: 6, snapPct: 0.74, oppDefRank: 24, vegasImpliedTotal: 26.5 },
  ] },
];

const TEAM_B = [
  { name: "B1 - WR1", history: [
    { playerId: "b1", fantasyPoints: 15.0, targets: 8, snapPct: 0.79, oppDefRank: 14, vegasImpliedTotal: 22.0 },
    { playerId: "b1", fantasyPoints: 12.8, targets: 6, snapPct: 0.77, oppDefRank: 20, vegasImpliedTotal: 23.5 },
    { playerId: "b1", fantasyPoints: 17.3, targets: 9, snapPct: 0.82, oppDefRank: 8, vegasImpliedTotal: 20.0 },
  ] },
  { name: "B2 - RB1", history: [
    { playerId: "b2", fantasyPoints: 19.1, targets: 5, snapPct: 0.73, oppDefRank: 27, vegasImpliedTotal: 22.0 },
    { playerId: "b2", fantasyPoints: 13.4, targets: 3, snapPct: 0.65, oppDefRank: 15, vegasImpliedTotal: 23.5 },
    { playerId: "b2", fantasyPoints: 10.9, targets: 2, snapPct: 0.60, oppDefRank: 6, vegasImpliedTotal: 20.0 },
  ] },
  { name: "B3 - WR2", history: [
    { playerId: "b3", fantasyPoints: 8.6, targets: 5, snapPct: 0.64, oppDefRank: 14, vegasImpliedTotal: 22.0 },
    { playerId: "b3", fantasyPoints: 6.2, targets: 4, snapPct: 0.60, oppDefRank: 20, vegasImpliedTotal: 23.5 },
    { playerId: "b3", fantasyPoints: 10.5, targets: 6, snapPct: 0.68, oppDefRank: 8, vegasImpliedTotal: 20.0 },
  ] },
];

type Projection = { playerId: string; predictedMu: number; predictedSigma: number };
type SimResult = {
  success: boolean;
  myProjections: Projection[];
  oppProjections: Projection[];
  simulationResults: {
    winProbability: number;
    myTeam: { floorP10: number; medianP50: number; ceilingP90: number };
    oppTeam: { floorP10: number; medianP50: number; ceilingP90: number };
  };
  error?: string;
};

function RangeBar({ label, floorP10, medianP50, ceilingP90, accent }: { label: string; floorP10: number; medianP50: number; ceilingP90: number; accent: string }) {
  const floor = floorP10;
  const median = medianP50;
  const ceiling = ceilingP90;
  const max = Math.max(ceiling, 1) * 1.15;
  return <div className="space-y-1.5">
    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{median.toFixed(1)} pts median</span>
    </div>
    <div className="relative h-2 rounded-full bg-background/50">
      <div
        className={`absolute inset-y-0 rounded-full ${accent}`}
        style={{ left: `${(floor / max) * 100}%`, width: `${((ceiling - floor) / max) * 100}%` }}
      />
      <div
        className="absolute inset-y-[-3px] w-[3px] rounded-full bg-white/80"
        style={{ left: `${(median / max) * 100}%` }}
      />
    </div>
    <div className="flex justify-between text-[10px] tabular-nums text-muted">
      <span>floor {floor.toFixed(1)}</span>
      <span>ceiling {ceiling.toFixed(1)}</span>
    </div>
  </div>;
}

export function MonteCarloDemo() {
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSimulation() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ml/matchup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          myRosterHistory: TEAM_A.map((player) => player.history),
          oppRosterHistory: TEAM_B.map((player) => player.history),
        }),
      });
      const data = (await response.json()) as SimResult;
      if (!data.success) throw new Error(data.error ?? "Simulation failed");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }

  return <Card>
    <CardContent className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Live Monte Carlo demo</h2>
          <p className="mt-1 text-xs text-muted">
            This calls a real, running API route (<code className="rounded bg-background/60 px-1 py-0.5 text-[11px]">/api/ml/matchup</code>):
            EWMA feature extraction -&gt; a linear projection -&gt; 10,000-trial Monte Carlo simulation, on two fixed
            sample rosters (not real players) so the demo is self-contained.
          </p>
        </div>
        <Button onClick={runSimulation} disabled={loading} size="sm" className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}
          Run simulation
        </Button>
      </div>

      {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">{error}</p>}

      {result && <div className="space-y-4">
        <div className="rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Team A win probability</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-violet-100">{(result.simulationResults.winProbability * 100).toFixed(1)}%</p>
          <p className="mt-1 text-[11px] text-muted">across 10,000 simulated outcomes, using per-player projected mean &amp; uncertainty (sigma)</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <RangeBar label="Team A" accent="bg-violet-400/70" {...result.simulationResults.myTeam} />
          <RangeBar label="Team B" accent="bg-sky-400/70" {...result.simulationResults.oppTeam} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[{ label: "Team A", rows: result.myProjections, names: TEAM_A }, { label: "Team B", rows: result.oppProjections, names: TEAM_B }].map((side) => <div key={side.label} className="space-y-1 rounded-lg border border-border bg-background/30 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{side.label} player projections</p>
            {side.rows.map((row, index) => <div key={row.playerId} className="flex items-center justify-between text-xs">
              <span className="font-bold">{side.names[index]?.name ?? row.playerId}</span>
              <span className="tabular-nums text-muted">mu {row.predictedMu.toFixed(1)} · sigma {row.predictedSigma.toFixed(1)}</span>
            </div>)}
          </div>)}
        </div>
      </div>}
    </CardContent>
  </Card>;
}
