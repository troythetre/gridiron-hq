"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, Eye, Plus, Star, Target, Trash2, TriangleAlert, X } from "lucide-react";
import { useFormStatus } from "react-dom";
import { saveParlay } from "@/app/actions/parlay-account";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import type { CollegeFootballRankings } from "@/lib/college-football-live";
import type { NflMockDraft } from "@/lib/nfl-mock-draft";
import type { NflMockDraftSnapshot } from "@/lib/nfl-mock-draft";
import type { PlayerRow } from "@/lib/types";
import { PlayerAvatar } from "@/components/player-avatar";
import { usePlayerFavorites, togglePlayerFavorite } from "@/lib/player-favorites";
import { usePlayerTargets, togglePlayerTarget } from "@/lib/player-targets";
import { usePlayerWatch, togglePlayerWatch } from "@/lib/player-watch";
import {
  useParlaySlip,
  setParlayStake,
  addParlayLeg,
  removeParlayLeg,
  updateParlayLeg,
  clearParlayLegs,
} from "@/lib/parlay-slip";
import {
  CollegeRankingsPanel,
  NflMockDraftPanel,
  RivalryHistoryPanel,
} from "./football-live-panels";
import { SportsbookAnalysis } from "./sportsbook-analysis";

type Sport = "NFL" | "CFB";
// "parlay" used to be its own tab; the parlay builder (bet slip) now lives
// alongside "sportsbook" as a sidebar instead - see ParlayBetSlip below.
// Legacy ?tab=parlay links are resolved to "sportsbook" in page.tsx.
type Tab = "sportsbook" | "mock-draft" | "college" | "rivalries";
type DraftPick = { id: string; pick: number; team: string; prospect: string; position: string; college: string };
type CollegeTeam = { id: string; rank: string; school: string; record: string; schedule: string };
type Prospect = { id: string; name: string; position: string; school: string; classYear: string; note: string };
type SavedState = { draftPicks: DraftPick[]; collegeTeams: CollegeTeam[]; prospects: Prospect[] };
type PoolFilter = "all" | "favorites" | "targeted" | "observed";

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
const POOL_FILTERS: { id: "favorites" | "targeted" | "observed"; label: string; icon: typeof Star }[] = [
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "targeted", label: "Targeted", icon: Target },
  { id: "observed", label: "Observed", icon: Eye },
];
const emptyState: SavedState = { draftPicks: [], collegeTeams: [], prospects: [] };
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
  initialTab = "sportsbook",
  mockDraft,
  collegeRankings,
  mockDraftHistory = [],
  mockDraftHistoryReady = true,
  players = [],
  linkedSportsbooks = [],
}: {
  initialSport?: Sport;
  initialTab?: Tab;
  mockDraft: NflMockDraft | null;
  collegeRankings: CollegeFootballRankings | null;
  mockDraftHistory?: NflMockDraftSnapshot[];
  mockDraftHistoryReady?: boolean;
  players?: PlayerRow[];
  linkedSportsbooks?: string[];
}) {
  const tab = initialTab;
  const sport = initialSport;
  const [cardPlayer, setCardPlayer] = useState<PlayerRow | null>(null);
  const favorites = usePlayerFavorites();
  const targets = usePlayerTargets();
  const watch = usePlayerWatch();
  const [riskLevel, setRiskLevel] = useState(35);
  const [poolFilter, setPoolFilter] = useState<PoolFilter>("all");
  const slip = useParlaySlip();

  const riskLabel = riskLevel < 34 ? "Conservative" : riskLevel < 67 ? "Balanced" : "Aggressive";
  const riskHint = riskLevel < 34
    ? "Sticking to top-ranked, consistent producers — fewer boom-or-bust swings."
    : riskLevel < 67
    ? "A mix of locked-in starters and a few deeper sleepers."
    : "Digging deep into the pool for high-upside, high-variance plays.";

  const rankedPlayers = useMemo(
    () => players.filter((player) => player.overall_rank != null).sort((a, b) => (a.overall_rank ?? 0) - (b.overall_rank ?? 0)),
    [players]
  );
  const poolDepth = Math.max(6, Math.round(12 + (riskLevel / 100) * Math.max(0, rankedPlayers.length - 12)));
  const riskPool = useMemo(() => rankedPlayers.slice(0, poolDepth), [rankedPlayers, poolDepth]);
  const pooledPlayers = useMemo(() => {
    const base = poolFilter === "all"
      ? riskPool
      : players.filter((player) =>
          poolFilter === "favorites" ? favorites.has(player.id)
          : poolFilter === "targeted" ? targets.has(player.id)
          : watch.has(player.id)
        );
    return base.slice(0, 24);
  }, [poolFilter, riskPool, players, favorites, targets, watch]);
  const snapshot = useSyncExternalStore(subscribeToSavedState, getSavedSnapshot, getServerSnapshot);
  const state = savedStateFromSnapshot(snapshot);

  const tabs: { id: Tab; label: string }[] = [
    { id: "sportsbook", label: "Sportsbook analysis" },
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
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Analyze parlays, compare sportsbook lines, expose market discrepancies, and explore the signals behind each game. Gridiron HQ is an analysis layer — not a sportsbook.</p>
    </header>

    <div className="sticky top-[var(--dash-header-h,76px)] z-20 -mx-4 flex flex-wrap gap-2 border-b border-border bg-background/95 px-4 pt-2 backdrop-blur-md sm:-mx-8 sm:px-8" role="tablist" aria-label="Parlay Lab tools">
      {tabs.map((item) => <Link
        key={item.id}
        href={item.id === "sportsbook" ? `/dashboard/parlay?sport=${sport}` : `/dashboard/parlay?tab=${item.id}`}
        role="tab"
        aria-selected={tab === item.id}
        className={`shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === item.id ? "border-violet-400 text-violet-200" : "border-transparent text-muted hover:text-foreground"}`}
      >{item.label}</Link>)}
    </div>

    {tab === "sportsbook" && <section className="space-y-8">
      <SportsbookAnalysis
        slipLegs={slip.legs}
        linkedSportsbookIds={linkedSportsbooks}
        onAddLeg={addParlayLeg}
      />
      <ParlayBetSlip sport={sport} />

      <section className="space-y-3">
        <SectionHeader title="Player pool" detail="Dial in how deep to search the pool, filter to your own lists, then tap a player for the full glass-view card." />
        <Card><CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
              <span>Conservative</span>
              <span className="text-violet-200">{riskLabel}</span>
              <span>Aggressive</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={riskLevel}
              onChange={(event) => setRiskLevel(Number(event.target.value))}
              aria-label="Risk tolerance: conservative to aggressive"
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-violet-400"
            />
            <p className="text-xs leading-5 text-muted">{riskHint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {POOL_FILTERS.map((item) => {
              const Icon = item.icon;
              return <button
                key={item.id}
                type="button"
                onClick={() => setPoolFilter((current) => (current === item.id ? "all" : item.id))}
                aria-pressed={poolFilter === item.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${poolFilter === item.id ? "border-violet-400/50 bg-violet-400/15 text-violet-200" : "border-border text-muted hover:text-foreground"}`}
              ><Icon className="h-3.5 w-3.5" />{item.label}</button>;
            })}
          </div>
          {pooledPlayers.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">{poolFilter === "all" ? "No players loaded for this pool yet." : "Nothing in this list yet — open a player card and tap the star, target, or eye icon to add one."}</p>}
          {pooledPlayers.length > 0 && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pooledPlayers.map((player) => {
              const isFav = favorites.has(player.id);
              const isTarget = targets.has(player.id);
              const isWatch = watch.has(player.id);
              return <button
                key={player.id}
                type="button"
                onClick={() => setCardPlayer(player)}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/30 p-3 text-left transition hover:border-violet-400/40 hover:bg-violet-400/5"
              >
                <PlayerAvatar name={player.name} team={player.team} position={player.pos} photoUrl={player.photoUrl} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{player.name}</span>
                  <span className="block truncate text-xs text-muted">{player.pos} · {player.team}{player.overall_rank ? ` · #${player.overall_rank} overall` : ""}</span>
                </span>
                <span className="flex shrink-0 gap-1">
                  {isFav && <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />}
                  {isTarget && <Target className="h-3.5 w-3.5 text-sky-300" />}
                  {isWatch && <Eye className="h-3.5 w-3.5 text-emerald-300" />}
                </span>
              </button>;
            })}
          </div>}
        </CardContent></Card>
      </section>
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

    {cardPlayer && <PlayerGlassCard player={cardPlayer} onClose={() => setCardPlayer(null)} />}
  </div>;
}

/*
 * The parlay bet slip - leg editor, stake, combined-odds summary, and the
 * "save to my account" form. This used to be the whole "parlay" tab; it's
 * now a sidebar next to Sportsbook Analysis so a user can click a line
 * there (via onAddLeg) and watch it land here immediately. It reads/writes
 * the shared slip in src/lib/parlay-slip.ts, so it also reflects legs
 * added from the sportsbook comparison cards.
 */
function ParlayBetSlip({ sport }: { sport: Sport }) {
  const slip = useParlaySlip();
  const [open, setOpen] = useState(false);
  const previousLegCount = useRef(slip.legs.length);

  /*
   * Pops the panel open whenever a leg is added - whether from the
   * manual "Add leg" button here, or (more commonly) from clicking a
   * sportsbook's line in the comparison panel above, which calls
   * addParlayLeg() directly and has no reference to this component.
   * Watching the shared slip's leg count is what lets either path
   * trigger the pop-up.
   */
  useEffect(() => {
    if (slip.legs.length > previousLegCount.current) {
      setOpen(true);
    }
    previousLegCount.current = slip.legs.length;
  }, [slip.legs.length]);

  if (slip.legs.length === 0) {
    return null;
  }

  const validLegs = slip.legs.map((leg) => ({ leg, decimal: americanToDecimal(leg.odds) }));
  const canCalculate = validLegs.length > 0 && validLegs.every(({ leg, decimal }) =>
    leg.event.trim() && leg.selection.trim() && decimal != null
  );
  const combinedDecimal = canCalculate ? validLegs.reduce((total, item) => total * (item.decimal ?? 1), 1) : null;
  const stakeNumber = Number(slip.stake);
  const payout = combinedDecimal != null && Number.isFinite(stakeNumber) && stakeNumber > 0 ? stakeNumber * combinedDecimal : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-violet-400/30 bg-[#150f1e] px-4 py-3 text-xs font-black text-violet-100 shadow-2xl shadow-black/40 transition hover:bg-[#1c1527]"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-violet-400 text-[10px] text-[#150f1e]">{slip.legs.length}</span>
        Parlay{combinedDecimal != null ? ` · ${decimalToAmerican(combinedDecimal)}` : ""}
      </button>
    );
  }

  return (
    <section className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm space-y-3 rounded-2xl border border-violet-400/20 bg-[#110c18] p-4 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">Parlay builder</h2>
          <p className="mt-0.5 text-[10px] text-muted">{slip.legs.length} leg{slip.legs.length === 1 ? "" : "s"} · click a line to add another</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => clearParlayLegs()} aria-label="Clear all legs" className="rounded-lg border border-border px-2 py-1.5 text-[9px] font-bold text-muted hover:border-red-400/40 hover:text-red-300">Clear</button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Minimize parlay builder" className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted hover:text-foreground"><ChevronDown className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
        {slip.legs.map((leg, index) => {
          const decimal = americanToDecimal(leg.odds);
          return <div key={leg.id} className="space-y-2 rounded-xl border border-border bg-background/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted">Leg {index + 1}{leg.book ? ` · ${leg.book}` : ""}</span>
              <button type="button" onClick={() => removeParlayLeg(leg.id)} aria-label={`Remove leg ${index + 1}`} className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-muted hover:border-red-400/40 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
            </div>
            <TeamAutocomplete value={leg.event} onChange={(value) => updateParlayLeg(leg.id, { event: value })} sport={sport} label={`Leg ${index + 1} game`} />
            <InputCell value={leg.selection} onChange={(value) => updateParlayLeg(leg.id, { selection: value })} placeholder="Selection (e.g. Bills -3.5)" label={`Leg ${index + 1} selection`} />
            <div className="flex items-center gap-2">
              <InputCell value={leg.odds} onChange={(value) => updateParlayLeg(leg.id, { odds: value })} placeholder="Odds (e.g. -110)" type="number" label={`Leg ${index + 1} American odds`} />
              <span className="w-12 shrink-0 text-[10px] text-muted">{decimal ? `${(100 / decimal).toFixed(0)}%` : "—"}</span>
            </div>
          </div>;
        })}
        <button type="button" disabled={slip.legs.length >= 12} onClick={() => addParlayLeg({ event: "", selection: "", odds: "" })} className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 px-3 py-1.5 text-[10px] font-bold text-violet-200 hover:bg-violet-400/10 disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Add {sport} leg</button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
        <div className="col-span-2 flex items-center gap-2 text-xs">
          <label className="shrink-0 font-bold uppercase tracking-wider text-muted" htmlFor="parlay-stake">Stake $</label>
          <Input id="parlay-stake" type="number" min="0.01" step="0.01" value={slip.stake} onChange={(event) => setParlayStake(event.target.value)} className="h-8 bg-background text-xs" />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Odds</p>
          <p className="text-sm font-black tabular-nums">{combinedDecimal != null ? decimalToAmerican(combinedDecimal) : "—"}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Payout</p>
          <p className="text-sm font-black tabular-nums">{payout != null ? `$${payout.toFixed(2)}` : "—"}</p>
        </div>
      </div>

      <form action={saveParlay} className="flex items-center justify-between gap-2">
        <input type="hidden" name="sport" value={sport} />
        <input type="hidden" name="legs" value={JSON.stringify(slip.legs)} />
        <input type="hidden" name="stake" value={slip.stake} />
        <input type="hidden" name="combinedOddsDecimal" value={combinedDecimal ?? ""} />
        <input type="hidden" name="potentialPayout" value={payout ?? ""} />
        <SaveParlayButton disabled={!canCalculate} />
        <Link href="/dashboard/account" className="text-[10px] font-bold text-violet-300 hover:text-violet-200">My account</Link>
      </form>

      <p className="flex gap-1.5 text-[9px] leading-4 text-muted"><TriangleAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />Not a forecast; doesn&apos;t account for sportsbook margin or correlated outcomes. Use responsibly.</p>
    </section>
  );
}

function SaveParlayButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button
    type="submit"
    disabled={disabled || pending}
    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-black text-primary-foreground disabled:opacity-50"
  >{pending ? "Saving…" : "Save to my account"}</button>;
}


function PlayerGlassCard({ player, onClose }: { player: PlayerRow; onClose: () => void }) {
  const favorites = usePlayerFavorites();
  const targets = usePlayerTargets();
  const watch = usePlayerWatch();
  const isFav = favorites.has(player.id);
  const isTarget = targets.has(player.id);
  const isWatch = watch.has(player.id);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return <div
    className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
  >
    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/15 bg-[linear-gradient(145deg,rgba(21,37,58,.92),rgba(31,25,54,.9),rgba(13,24,39,.92))] p-6 text-center shadow-2xl backdrop-blur-xl">
      <button type="button" onClick={onClose} aria-label="Close player card" className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-white/15 text-muted hover:text-foreground"><X className="h-4 w-4" /></button>
      <div className="mx-auto grid place-items-center">
        <PlayerAvatar name={player.name} team={player.team} position={player.pos} photoUrl={player.photoUrl} size={132} />
      </div>
      <h3 className="mt-4 text-xl font-black">{player.name}</h3>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">{player.pos} · {player.team}{player.overall_rank ? ` · #${player.overall_rank} overall` : ""}{player.pos_rank ? ` · #${player.pos_rank} ${player.pos}` : ""}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-white/10 bg-black/20 p-2"><p className="text-[9px] font-bold uppercase tracking-wider text-muted">Total pts</p><p className="mt-1 text-lg font-black tabular-nums">{player.total_pts.toFixed(1)}</p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-2"><p className="text-[9px] font-bold uppercase tracking-wider text-muted">Avg pts</p><p className="mt-1 text-lg font-black tabular-nums">{player.avg_pts.toFixed(1)}</p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-2"><p className="text-[9px] font-bold uppercase tracking-wider text-muted">Games</p><p className="mt-1 text-lg font-black tabular-nums">{player.games}</p></div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => togglePlayerFavorite(player.id)} aria-pressed={isFav} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${isFav ? "border-amber-300/50 bg-amber-300/15 text-amber-200" : "border-white/15 text-muted hover:text-foreground"}`}><Star className="h-3.5 w-3.5" />Favorite</button>
        <button type="button" onClick={() => togglePlayerTarget(player.id)} aria-pressed={isTarget} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${isTarget ? "border-sky-300/50 bg-sky-300/15 text-sky-200" : "border-white/15 text-muted hover:text-foreground"}`}><Target className="h-3.5 w-3.5" />Target</button>
        <button type="button" onClick={() => togglePlayerWatch(player.id)} aria-pressed={isWatch} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${isWatch ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-200" : "border-white/15 text-muted hover:text-foreground"}`}><Eye className="h-3.5 w-3.5" />Observe</button>
      </div>
      {player.profileHref && <Link href={player.profileHref} className="mt-4 inline-block text-xs font-bold text-violet-300 hover:text-violet-200">View full player profile →</Link>}
    </div>
  </div>;
}
