"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Sport = "NFL" | "CFB";
type Tab = "parlay" | "mock-draft" | "college";
type ParlayLeg = { id: string; event: string; selection: string; odds: string };
type DraftPick = { id: string; pick: number; team: string; prospect: string; position: string; college: string };
type CollegeTeam = { id: string; rank: string; school: string; record: string; schedule: string };
type Prospect = { id: string; name: string; position: string; school: string; classYear: string; note: string };
type SavedState = { legs: ParlayLeg[]; stake: string; draftPicks: DraftPick[]; collegeTeams: CollegeTeam[]; prospects: Prospect[] };

const STORAGE_KEY = "gridiron-hq-parlay-lab-v1";
const emptyState: SavedState = { legs: [], stake: "10", draftPicks: [], collegeTeams: [], prospects: [] };
let fallbackSnapshot: string | null = null;

function subscribeToSavedState(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("gridiron-parlay-lab-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("gridiron-parlay-lab-change", onChange);
  };
}

function getSavedSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return fallbackSnapshot;
  }
}

function getServerSnapshot() {
  return null;
}

function saveSnapshot(value: string) {
  fallbackSnapshot = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // The board still persists for this browser session when storage is unavailable.
  }
  window.dispatchEvent(new Event("gridiron-parlay-lab-change"));
}

function savedStateFromSnapshot(value: string | null): SavedState {
  if (!value) return emptyState;
  try {
    const saved = JSON.parse(value) as Partial<SavedState>;
    return {
      legs: Array.isArray(saved.legs) ? saved.legs : [],
      stake: typeof saved.stake === "string" ? saved.stake : emptyState.stake,
      draftPicks: Array.isArray(saved.draftPicks) ? saved.draftPicks : [],
      collegeTeams: Array.isArray(saved.collegeTeams) ? saved.collegeTeams : [],
      prospects: Array.isArray(saved.prospects) ? saved.prospects : [],
    };
  } catch {
    return emptyState;
  }
}

function rowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function americanToDecimal(value: string) {
  const odds = Number(value);
  if (!Number.isInteger(odds) || Math.abs(odds) < 100) return null;
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds);
}

function decimalToAmerican(decimal: number) {
  if (decimal <= 1) return "—";
  const american = decimal >= 2
    ? (decimal - 1) * 100
    : -100 / (decimal - 1);
  return `${american > 0 ? "+" : ""}${Math.round(american)}`;
}

function InputCell({ value, onChange, placeholder, type = "text", min, step, label }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "number";
  min?: number;
  step?: number;
  label: string;
}) {
  return <Input
    type={type}
    value={value}
    min={min}
    step={step}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    aria-label={label}
    className="h-10 min-w-0 bg-background"
  />;
}

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return <div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-xs text-muted">{detail}</p></div>;
}

export function ParlayLab({ initialSport = "NFL", initialTab = "parlay" }: { initialSport?: Sport; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const sport = initialSport;
  const snapshot = useSyncExternalStore(subscribeToSavedState, getSavedSnapshot, getServerSnapshot);
  const state = savedStateFromSnapshot(snapshot);

  const validLegs = state.legs.map((leg) => ({ leg, decimal: americanToDecimal(leg.odds) }));
  const canCalculate = validLegs.length > 0 && validLegs.every(({ leg, decimal }) =>
    leg.event.trim() && leg.selection.trim() && decimal != null
  );
  const combinedDecimal = canCalculate ? validLegs.reduce((total, item) => total * (item.decimal ?? 1), 1) : null;
  const stake = Number(state.stake);
  const payout = combinedDecimal != null && Number.isFinite(stake) && stake > 0 ? stake * combinedDecimal : null;
  const impliedProbability = canCalculate
    ? validLegs.reduce((total, item) => total * (1 / (item.decimal ?? 1)), 1) * 100
    : null;
  const tabs: { id: Tab; label: string }[] = [
    { id: "parlay", label: "Parlay builder" },
    { id: "mock-draft", label: "NFL mock draft" },
    { id: "college", label: "College football" },
  ];

  const updateState = <K extends keyof SavedState>(key: K, value: SavedState[K]) => {
    saveSnapshot(JSON.stringify({ ...state, [key]: value }));
  };

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-3xl border border-violet-400/20 bg-[radial-gradient(ellipse_at_85%_0%,rgba(139,92,246,.16),transparent_42%),linear-gradient(130deg,#1b1526,#0d0b12_65%,#17121f)] p-6 sm:p-9">
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">NFL · College football</p>
      <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">Parlay Lab</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Build a ticket, organize an NFL mock draft, and track college teams and prospects. Your boards are saved in this browser.</p>
    </header>

    <div className="flex gap-2 overflow-x-auto border-b border-border" role="tablist" aria-label="Parlay Lab tools">
      {tabs.map((item) => <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={tab === item.id}
        onClick={() => setTab(item.id)}
        className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === item.id ? "border-violet-400 text-violet-200" : "border-transparent text-muted hover:text-foreground"}`}
      >{item.label}</button>)}
    </div>

    {tab === "parlay" && <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader title="Parlay builder" detail="Enter the lines shown by your sportsbook to calculate combined odds and returns." />
        <div className="flex rounded-xl border border-border bg-surface p-1" aria-label="Parlay sport">
          {(["NFL", "CFB"] as const).map((item) => <Link key={item} href={`/dashboard/parlay?sport=${item}`} aria-current={sport === item ? "page" : undefined} className={`rounded-lg px-4 py-2 text-xs font-black ${sport === item ? "bg-violet-400/20 text-violet-200" : "text-muted hover:text-foreground"}`}>{item}</Link>)}
        </div>
      </div>
      <Card><CardContent className="space-y-3 p-4">
        {state.legs.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">No legs yet. Add a game outcome or player prop to get started.</p>}
        {state.legs.map((leg, index) => {
          const decimal = americanToDecimal(leg.odds);
          return <div key={leg.id} className="grid gap-2 rounded-xl border border-border bg-background/30 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_130px_auto] sm:items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted sm:hidden">Leg {index + 1}</span>
            <InputCell value={leg.event} onChange={(value) => updateState("legs", state.legs.map((entry) => entry.id === leg.id ? { ...entry, event: value } : entry))} placeholder={sport === "NFL" ? "Game (e.g. Bills vs Jets)" : "Game (e.g. Oregon vs USC)"} label={`Leg ${index + 1} game`} />
            <InputCell value={leg.selection} onChange={(value) => updateState("legs", state.legs.map((entry) => entry.id === leg.id ? { ...entry, selection: value } : entry))} placeholder="Selection (e.g. Bills -3.5)" label={`Leg ${index + 1} selection`} />
            <div className="flex items-center gap-2">
              <InputCell value={leg.odds} onChange={(value) => updateState("legs", state.legs.map((entry) => entry.id === leg.id ? { ...entry, odds: value } : entry))} placeholder="Odds (e.g. -110)" type="number" label={`Leg ${index + 1} American odds`} />
              <span className="w-12 shrink-0 text-[10px] text-muted">{decimal ? `${(100 / decimal).toFixed(0)}%` : "—"}</span>
            </div>
            <button type="button" onClick={() => updateState("legs", state.legs.filter((entry) => entry.id !== leg.id))} aria-label={`Remove leg ${index + 1}`} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-muted hover:border-red-400/40 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
          </div>;
        })}
        <button type="button" disabled={state.legs.length >= 12} onClick={() => updateState("legs", [...state.legs, { id: rowId(), event: "", selection: "", odds: "" }])} className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 px-4 py-2 text-xs font-bold text-violet-200 hover:bg-violet-400/10 disabled:opacity-50"><Plus className="h-4 w-4" />Add {sport} leg</button>
      </CardContent></Card>
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><label className="text-[10px] font-bold uppercase tracking-wider text-muted" htmlFor="parlay-stake">Stake</label><div className="mt-2 flex items-center gap-2"><span className="text-muted">$</span><Input id="parlay-stake" type="number" min="0.01" step="0.01" value={state.stake} onChange={(event) => updateState("stake", event.target.value)} className="h-10 bg-background" /></div></CardContent></Card>
        <SummaryCard label="Combined odds" value={combinedDecimal != null ? decimalToAmerican(combinedDecimal) : "—"} />
        <SummaryCard label="Potential return" value={payout != null ? `$${payout.toFixed(2)}` : "—"} />
        <SummaryCard label="Combined implied probability" value={impliedProbability != null ? `${impliedProbability.toFixed(2)}%` : "—"} />
      </div>
      <p className="flex gap-2 text-xs leading-5 text-muted"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />Multiplies each leg&apos;s odds-implied probability; it is not a true forecast and does not account for sportsbook margin or correlated outcomes. A parlay can lose even when most legs win. Use responsibly.</p>
    </section>}

    {tab === "mock-draft" && <section className="space-y-4">
      <SectionHeader title="NFL mock draft board" detail="Add prospects and teams to organize your own draft projection. No external prospect rankings are loaded yet." />
      <Card><CardContent className="space-y-3 p-4">
        {state.draftPicks.map((pick, index) => <div key={pick.id} className="grid gap-2 rounded-xl border border-border bg-background/30 p-3 sm:grid-cols-[70px_minmax(0,1fr)_minmax(0,1fr)_100px_minmax(0,1fr)_auto]">
          <InputCell value={String(pick.pick)} onChange={(value) => updateState("draftPicks", state.draftPicks.map((entry) => entry.id === pick.id ? { ...entry, pick: Number(value) || 1 } : entry))} placeholder="Pick" type="number" min={1} label={`Pick number ${index + 1}`} />
          <InputCell value={pick.team} onChange={(value) => updateState("draftPicks", state.draftPicks.map((entry) => entry.id === pick.id ? { ...entry, team: value } : entry))} placeholder="NFL team" label={`Pick ${pick.pick} NFL team`} />
          <InputCell value={pick.prospect} onChange={(value) => updateState("draftPicks", state.draftPicks.map((entry) => entry.id === pick.id ? { ...entry, prospect: value } : entry))} placeholder="Prospect name" label={`Pick ${pick.pick} prospect`} />
          <InputCell value={pick.position} onChange={(value) => updateState("draftPicks", state.draftPicks.map((entry) => entry.id === pick.id ? { ...entry, position: value } : entry))} placeholder="Pos" label={`Pick ${pick.pick} position`} />
          <InputCell value={pick.college} onChange={(value) => updateState("draftPicks", state.draftPicks.map((entry) => entry.id === pick.id ? { ...entry, college: value } : entry))} placeholder="College" label={`Pick ${pick.pick} college`} />
          <button type="button" onClick={() => updateState("draftPicks", state.draftPicks.filter((entry) => entry.id !== pick.id))} aria-label={`Remove pick ${pick.pick}`} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-muted hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
        </div>)}
        {state.draftPicks.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">Your mock draft is empty. Add the first pick.</p>}
        <button type="button" onClick={() => updateState("draftPicks", [...state.draftPicks, { id: rowId(), pick: state.draftPicks.length + 1, team: "", prospect: "", position: "", college: "" }])} className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 px-4 py-2 text-xs font-bold text-violet-200 hover:bg-violet-400/10"><Plus className="h-4 w-4" />Add draft pick</button>
      </CardContent></Card>
    </section>}

    {tab === "college" && <section className="space-y-6">
      <SectionHeader title="College football workspace" detail="Track team rankings and game notes, and keep a watchlist of NFL prospects." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2"><SectionHeader title="Team rankings & schedule" detail="Add a rank, record, and next game or result." /><button type="button" onClick={() => updateState("collegeTeams", [...state.collegeTeams, { id: rowId(), rank: "", school: "", record: "", schedule: "" }])} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-400/30 px-3 py-2 text-[10px] font-bold text-violet-200"><Plus className="h-3.5 w-3.5" />Team</button></div>
          <Card><CardContent className="space-y-2 p-3">
            {state.collegeTeams.map((team, index) => <div key={team.id} className="grid grid-cols-[55px_minmax(0,1fr)_auto] gap-2 rounded-lg border border-border p-2">
              <InputCell value={team.rank} onChange={(value) => updateState("collegeTeams", state.collegeTeams.map((entry) => entry.id === team.id ? { ...entry, rank: value } : entry))} placeholder="#" type="number" min={1} label={`Team ${index + 1} ranking`} />
              <InputCell value={team.school} onChange={(value) => updateState("collegeTeams", state.collegeTeams.map((entry) => entry.id === team.id ? { ...entry, school: value } : entry))} placeholder="School" label={`Team ${index + 1} school`} />
              <button type="button" onClick={() => updateState("collegeTeams", state.collegeTeams.filter((entry) => entry.id !== team.id))} aria-label={`Remove ${team.school || `team ${index + 1}`}`} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-muted hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
              <div className="col-span-3 grid grid-cols-2 gap-2"><InputCell value={team.record} onChange={(value) => updateState("collegeTeams", state.collegeTeams.map((entry) => entry.id === team.id ? { ...entry, record: value } : entry))} placeholder="Record (e.g. 5-1)" label={`${team.school || "Team"} record`} /><InputCell value={team.schedule} onChange={(value) => updateState("collegeTeams", state.collegeTeams.map((entry) => entry.id === team.id ? { ...entry, schedule: value } : entry))} placeholder="Next game / result" label={`${team.school || "Team"} schedule or result`} /></div>
            </div>)}
            {!state.collegeTeams.length && <p className="p-6 text-center text-xs text-muted">No teams saved yet.</p>}
          </CardContent></Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-2"><SectionHeader title="NFL prospect watchlist" detail="Track college players you are following." /><button type="button" onClick={() => updateState("prospects", [...state.prospects, { id: rowId(), name: "", position: "", school: "", classYear: "", note: "" }])} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-400/30 px-3 py-2 text-[10px] font-bold text-violet-200"><Plus className="h-3.5 w-3.5" />Prospect</button></div>
          <Card><CardContent className="space-y-2 p-3">
            {state.prospects.map((prospect, index) => <div key={prospect.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_80px_auto] gap-2">
                <InputCell value={prospect.name} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, name: value } : entry))} placeholder="Player name" label={`Prospect ${index + 1} name`} />
                <InputCell value={prospect.position} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, position: value } : entry))} placeholder="Pos" label={`Prospect ${index + 1} position`} />
                <button type="button" onClick={() => updateState("prospects", state.prospects.filter((entry) => entry.id !== prospect.id))} aria-label={`Remove ${prospect.name || `prospect ${index + 1}`}`} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-muted hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2"><InputCell value={prospect.school} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, school: value } : entry))} placeholder="School" label={`${prospect.name || "Prospect"} school`} /><InputCell value={prospect.classYear} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, classYear: value } : entry))} placeholder="Class / draft year" label={`${prospect.name || "Prospect"} class year`} /></div>
              <InputCell value={prospect.note} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, note: value } : entry))} placeholder="Notes" label={`${prospect.name || "Prospect"} notes`} />
            </div>)}
            {!state.prospects.length && <p className="p-6 text-center text-xs text-muted">No prospects saved yet.</p>}
          </CardContent></Card>
        </section>
      </div>
      <p className="text-xs leading-5 text-muted">Team ranks, schedules, results, prospects, and draft picks are manual notes stored only in this browser. They are not live NCAA or NFL prospect data.</p>
    </section>}
  </div>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p><p className="mt-2 text-2xl font-black tabular-nums">{value}</p></CardContent></Card>;
}
