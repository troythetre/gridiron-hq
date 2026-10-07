"use client";

import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import type { CollegeFootballRankings } from "@/lib/college-football-live";
import type { NflMockDraft } from "@/lib/nfl-mock-draft";
import {
  CollegeRankingsPanel,
  NflMockDraftPanel,
  RivalryHistoryPanel,
} from "./football-live-panels";

type Sport = "NFL" | "CFB";
type Tab = "parlay" | "mock-draft" | "college" | "rivalries";
type BookLine = { book: string; odds: string };
type ParlayLeg = { id: string; event: string; selection: string; odds: string; book?: string; bookLines?: BookLine[] };
type DraftPick = { id: string; pick: number; team: string; prospect: string; position: string; college: string };
type CollegeTeam = { id: string; rank: string; school: string; record: string; schedule: string };
type Prospect = { id: string; name: string; position: string; school: string; classYear: string; note: string };
type SavedState = { legs: ParlayLeg[]; stake: string; draftPicks: DraftPick[]; collegeTeams: CollegeTeam[]; prospects: Prospect[] };

const STORAGE_KEY = "gridiron-hq-parlay-lab-v1";
const NFL_TEAMS = [
  "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills", "Carolina Panthers", "Chicago Bears",
  "Cincinnati Bengals", "Cleveland Browns", "Dallas Cowboys", "Denver Broncos", "Detroit Lions", "Green Bay Packers",
  "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Kansas City Chiefs", "Las Vegas Raiders",
  "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins", "Minnesota Vikings", "New England Patriots",
  "New Orleans Saints", "New York Giants", "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers",
  "San Francisco 49ers", "Seattle Seahawks", "Tampa Bay Buccaneers", "Tennessee Titans", "Washington Commanders",
];
const CFB_TEAMS = [
  "Alabama", "Arizona", "Arizona State", "Arkansas", "Auburn", "Boise State", "BYU", "Clemson", "Colorado",
  "Duke", "Florida", "Florida State", "Georgia", "Georgia Tech", "Iowa", "Kansas State", "LSU", "Louisville",
  "Miami", "Michigan", "Missouri", "NC State", "Nebraska", "Notre Dame", "Ohio State", "Oklahoma", "Oklahoma State",
  "Ole Miss", "Oregon", "Penn State", "Pittsburgh", "SMU", "South Carolina", "Tennessee", "Texas", "Texas A&M",
  "Texas Tech", "UCF", "UCLA", "USC", "Utah", "Virginia Tech", "Washington", "West Virginia", "Wisconsin",
];
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

function TeamAutocomplete({ value, onChange, sport, label }: { value: string; onChange: (value: string) => void; sport: Sport; label: string }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const teams = sport === "NFL" ? NFL_TEAMS : CFB_TEAMS;
  const currentFragment = value.match(/\bvs\.?\s*(.*)$/i)?.[1] ?? value;
  const suggestions = teams.filter((team) => team.toLowerCase().includes(currentFragment.trim().toLowerCase())).slice(0, 8);

  function choose(team: string) {
    const matchupPrefix = value.match(/^(.*\bvs\.?\s*)(.*)$/i)?.[1];
    onChange(matchupPrefix ? `${matchupPrefix}${team}` : team);
    setOpen(false);
    setActiveIndex(0);
  }

  return <div className="relative min-w-0">
    <Input
      value={value}
      onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(0); }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (!open || suggestions.length === 0) return;
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveIndex((index) => (index + 1) % suggestions.length);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
        } else if (event.key === "Enter") {
          event.preventDefault();
          choose(suggestions[activeIndex]);
        } else if (event.key === "Escape") {
          setOpen(false);
        }
      }}
      role="combobox"
      aria-label={label}
      aria-autocomplete="list"
      aria-expanded={open && suggestions.length > 0}
      aria-controls={listId}
      placeholder={sport === "NFL" ? "Game (e.g. Bills vs Jets)" : "Game (e.g. Oregon vs USC)"}
      className="h-10 min-w-0 bg-background"
    />
    {open && suggestions.length > 0 && <div id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl">
      <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted">{sport === "NFL" ? "NFL teams" : "Popular college teams"}</p>
      {suggestions.map((team, index) => <button
        key={team}
        type="button"
        role="option"
        aria-selected={activeIndex === index}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(team)}
        className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${index === activeIndex ? "bg-violet-400/15 text-violet-100" : "text-foreground hover:bg-background"}`}
      >{team}</button>)}
    </div>}
  </div>;
}

function SectionHeader({ title, detail }: { title: string; detail: string }) {
  return <div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-xs text-muted">{detail}</p></div>;
}

export function ParlayLab({
  initialSport = "NFL",
  initialTab = "parlay",
  mockDraft,
  collegeRankings,
}: {
  initialSport?: Sport;
  initialTab?: Tab;
  mockDraft: NflMockDraft | null;
  collegeRankings: CollegeFootballRankings | null;
}) {
  const tab = initialTab;
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
    { id: "college", label: "College rankings" },
    { id: "rivalries", label: "Rivalry history" },
  ];

  const updateState = <K extends keyof SavedState>(key: K, value: SavedState[K]) => {
    saveSnapshot(JSON.stringify({ ...state, [key]: value }));
  };

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="relative isolate overflow-hidden rounded-3xl border border-violet-400/20 bg-[#110c18] p-6 sm:min-h-[310px] sm:p-9">
      <Image src="/parlay-lab-action.jpeg" alt="" fill priority sizes="(max-width: 1024px) 100vw, 1152px" className="absolute inset-0 -z-20 object-cover object-[center_38%] opacity-60" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#130e1a_0%,rgba(19,14,26,.96)_37%,rgba(19,14,26,.48)_72%,rgba(19,14,26,.2)_100%),linear-gradient(0deg,rgba(13,10,18,.72),transparent_70%)]" />
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">NFL · College football</p>
      <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">Parlay Lab</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Build parlays from odds you enter, follow the latest NFL mock draft, and explore live college rankings and rivalry history. No live sportsbook lines or automatic bet placement.</p>
    </header>

    <div className="flex flex-wrap gap-2 border-b border-border" role="tablist" aria-label="Parlay Lab tools">
      {tabs.map((item) => <Link
        key={item.id}
        href={item.id === "parlay" ? `/dashboard/parlay?sport=${sport}` : `/dashboard/parlay?tab=${item.id}`}
        role="tab"
        aria-selected={tab === item.id}
        className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === item.id ? "border-violet-400 text-violet-200" : "border-transparent text-muted hover:text-foreground"}`}
      >{item.label}</Link>)}
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
            <TeamAutocomplete value={leg.event} onChange={(value) => updateState("legs", state.legs.map((entry) => entry.id === leg.id ? { ...entry, event: value } : entry))} sport={sport} label={`Leg ${index + 1} game`} />
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

    {tab === "mock-draft" && mockDraft && <NflMockDraftPanel data={mockDraft} />}
    {tab === "mock-draft" && !mockDraft && <p role="alert" className="rounded-xl border border-amber-400/30 p-4 text-sm text-amber-100">The NFL mock draft data was not provided to this view. Reload the page to try again.</p>}

    {tab === "college" && <section className="space-y-6">
      {collegeRankings
        ? <CollegeRankingsPanel data={collegeRankings} />
        : <p role="alert" className="rounded-xl border border-amber-400/30 p-4 text-sm text-amber-100">College rankings were not provided to this view. Reload the page to try again.</p>}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <SectionHeader title="NFL prospect watchlist" detail="Your personal notes on college players to follow." />
          <button type="button" onClick={() => updateState("prospects", [...state.prospects, { id: rowId(), name: "", position: "", school: "", classYear: "", note: "" }])} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-400/30 px-3 py-2 text-[10px] font-bold text-violet-200"><Plus className="h-3.5 w-3.5" />Prospect</button>
        </div>
        <Card><CardContent className="space-y-2 p-3">
          {state.prospects.map((prospect, index) => <div key={prospect.id} className="space-y-2 rounded-lg border border-border p-3">
            <div className="grid grid-cols-[minmax(0,1fr)_80px_auto] gap-2">
              <InputCell value={prospect.name} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, name: value } : entry))} placeholder="Player name" label={`Prospect ${index + 1} name`} />
              <InputCell value={prospect.position} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, position: value } : entry))} placeholder="Pos" label={`Prospect ${index + 1} position`} />
              <button type="button" onClick={() => updateState("prospects", state.prospects.filter((entry) => entry.id !== prospect.id))} aria-label={`Remove ${prospect.name || `prospect ${index + 1}`}`} className="grid h-10 w-10 place-items-center rounded-lg border border-border text-muted hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2"><InputCell value={prospect.school} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, school: value } : entry))} placeholder="School" label={`${prospect.name || "Prospect"} school`} /><InputCell value={prospect.classYear} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, classYear: value } : entry))} placeholder="School year / draft year" label={`${prospect.name || "Prospect"} class year`} /></div>
            <InputCell value={prospect.note} onChange={(value) => updateState("prospects", state.prospects.map((entry) => entry.id === prospect.id ? { ...entry, note: value } : entry))} placeholder="Notes" label={`${prospect.name || "Prospect"} notes`} />
          </div>)}
          {!state.prospects.length && <p className="p-6 text-center text-xs text-muted">No prospects saved yet.</p>}
        </CardContent></Card>
      </section>
    </section>}

    {tab === "rivalries" && <RivalryHistoryPanel />}
  </div>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p><p className="mt-2 text-2xl font-black tabular-nums">{value}</p></CardContent></Card>;
}
