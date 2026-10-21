"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Ban, CheckCircle2, Clock3, Crown, Flame, Trash2, TrendingUp, Wallet, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { decimalOddsToAmerican, summarizeLegs, type ParlayAccountStats } from "@/lib/parlay-format";
import type { SavedParlayRow } from "@/lib/types";
import { deleteSavedParlay, setParlayStatus } from "@/app/actions/parlay-account";

const STATUS_META: Record<SavedParlayRow["status"], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", className: "border-amber-300/40 bg-amber-300/10 text-amber-200", icon: Clock3 },
  won: { label: "Won", className: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200", icon: CheckCircle2 },
  lost: { label: "Lost", className: "border-red-400/40 bg-red-400/10 text-red-300", icon: XCircle },
  void: { label: "Void", className: "border-white/15 bg-white/[.04] text-muted", icon: Ban },
};

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase());
  return parts.join("") || "B";
}

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function StatCard({ icon: Icon, label, value, tone = "default" }: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass = tone === "positive" ? "text-emerald-300" : tone === "negative" ? "text-red-300" : "text-foreground";
  return <Card><CardContent className="p-4">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted"><Icon className="h-3.5 w-3.5" />{label}</div>
    <p className={`mt-2 text-2xl font-black tabular-nums ${toneClass}`}>{value}</p>
  </CardContent></Card>;
}

function SpotlightCard({ title, icon: Icon, accent, parlay, emptyHint }: {
  title: string;
  icon: typeof Crown;
  accent: string;
  parlay: SavedParlayRow | null;
  emptyHint: string;
}) {
  return <Card className={`overflow-hidden border ${accent}`}><CardContent className="p-5">
    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted"><Icon className="h-4 w-4" />{title}</div>
    {parlay ? <>
      <p className="mt-3 text-sm font-bold leading-6">{summarizeLegs(parlay.legs, 4)}</p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Odds</p><p className="text-lg font-black tabular-nums">{decimalOddsToAmerican(parlay.combined_odds_decimal)}</p></div>
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Stake</p><p className="text-lg font-black tabular-nums">{money(Number(parlay.stake))}</p></div>
        <div><p className="text-[10px] font-bold uppercase tracking-wider text-muted">Payout</p><p className="text-lg font-black tabular-nums text-emerald-300">{money(parlay.actual_payout != null ? Number(parlay.actual_payout) : null)}</p></div>
      </div>
    </> : <p className="mt-3 text-sm text-muted">{emptyHint}</p>}
  </CardContent></Card>;
}

function StatusButton({ parlayId, status, label, className }: {
  parlayId: string;
  status: SavedParlayRow["status"];
  label: string;
  className: string;
}) {
  return <form action={setParlayStatus}>
    <input type="hidden" name="parlayId" value={parlayId} />
    <input type="hidden" name="status" value={status} />
    <button type="submit" className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${className}`}>{label}</button>
  </form>;
}

function ParlayRow({ parlay }: { parlay: SavedParlayRow }) {
  const meta = STATUS_META[parlay.status];
  const StatusIcon = meta.icon;
  return <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/30 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.className}`}><StatusIcon className="h-3 w-3" />{meta.label}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{parlay.sport}</span>
        <span className="text-[10px] text-muted">{formatDate(parlay.placed_at)}</span>
      </div>
      <p className="truncate text-sm font-bold">{summarizeLegs(parlay.legs)}</p>
      <p className="text-xs text-muted">
        {parlay.legs.length} leg{parlay.legs.length === 1 ? "" : "s"} · {decimalOddsToAmerican(parlay.combined_odds_decimal)} · stake {money(Number(parlay.stake))}
        {parlay.potential_payout != null ? ` · to win ${money(Number(parlay.potential_payout))}` : ""}
      </p>
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      {parlay.status !== "won" && <StatusButton parlayId={parlay.id} status="won" label="Won" className="border-emerald-300/30 text-emerald-200 hover:bg-emerald-300/10" />}
      {parlay.status !== "lost" && <StatusButton parlayId={parlay.id} status="lost" label="Lost" className="border-red-400/30 text-red-300 hover:bg-red-400/10" />}
      {parlay.status !== "void" && <StatusButton parlayId={parlay.id} status="void" label="Void" className="border-white/15 text-muted hover:bg-white/[.06]" />}
      {parlay.status !== "pending" && <StatusButton parlayId={parlay.id} status="pending" label="Reopen" className="border-amber-300/30 text-amber-200 hover:bg-amber-300/10" />}
      <form action={deleteSavedParlay}>
        <input type="hidden" name="parlayId" value={parlay.id} />
        <button type="submit" aria-label="Delete saved parlay" className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted hover:border-red-400/40 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
      </form>
    </div>
  </div>;
}

export function ParlayAccountView({ displayName, email, parlays, stats }: {
  displayName: string;
  email: string | null;
  parlays: SavedParlayRow[];
  stats: ParlayAccountStats;
}) {
  const [filter, setFilter] = useState<"all" | SavedParlayRow["status"]>("all");
  const filtered = filter === "all" ? parlays : parlays.filter((parlay) => parlay.status === filter);

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="relative isolate overflow-hidden rounded-3xl border border-violet-400/20 bg-[linear-gradient(135deg,#140f1d,#190f24_55%,#0d0c16)] p-6 sm:p-9">
      <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-white/15 bg-[linear-gradient(145deg,#7c3aed,#2563eb)] text-xl font-black text-white shadow-lg">{initials(displayName)}</span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-violet-300">Bettor account</p>
          <h1 className="mt-1 truncate font-display text-3xl font-black sm:text-4xl">{displayName}</h1>
          {email && <p className="mt-1 truncate text-xs text-muted">{email}</p>}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href="/dashboard/parlay" className="rounded-full border border-violet-400/30 px-4 py-2 text-xs font-bold text-violet-200 hover:bg-violet-400/10">Build a parlay</Link>
          <Link href="/dashboard/leaderboard" className="rounded-full border border-border px-4 py-2 text-xs font-bold text-muted hover:text-foreground">View leaderboard</Link>
        </div>
      </div>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Wallet} label="Total staked" value={money(stats.totalStaked)} />
      <StatCard
        icon={TrendingUp}
        label="Net profit/loss"
        value={stats.netProfit == null ? "—" : `${stats.netProfit >= 0 ? "+" : ""}${money(stats.netProfit)}`}
        tone={stats.netProfit == null ? "default" : stats.netProfit >= 0 ? "positive" : "negative"}
      />
      <StatCard icon={CheckCircle2} label="Win rate" value={stats.winRate == null ? "—" : `${stats.winRate.toFixed(0)}%`} />
      <StatCard icon={Flame} label="Record (W-L-V)" value={`${stats.wonCount}-${stats.lostCount}-${stats.voidCount}`} />
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <SpotlightCard
        title="Biggest winnings"
        icon={Crown}
        accent="border-amber-300/25 bg-[linear-gradient(145deg,rgba(120,53,15,.18),rgba(0,0,0,0))]"
        parlay={stats.biggestWin}
        emptyHint="Mark a parlay Won below to see your biggest cash-out here."
      />
      <SpotlightCard
        title="Lowest odds cashed"
        icon={Award}
        accent="border-sky-300/25 bg-[linear-gradient(145deg,rgba(12,74,110,.18),rgba(0,0,0,0))]"
        parlay={stats.lowestOddsWin}
        emptyHint="Your gutsiest winning parlay (shortest odds) will show up here."
      />
    </div>

    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Recent parlays</h2>
          <p className="mt-1 text-xs text-muted">Everything you&apos;ve saved from the Parlay Lab. Mark a leg won or lost once it settles.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "pending", "won", "lost", "void"] as const).map((item) => <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            aria-pressed={filter === item}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition ${filter === item ? "border-violet-400/50 bg-violet-400/15 text-violet-200" : "border-border text-muted hover:text-foreground"}`}
          >{item}</button>)}
        </div>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          {parlays.length === 0
            ? <>No saved parlays yet. Build one in the <Link href="/dashboard/parlay" className="font-bold text-violet-300">Parlay Lab</Link> and hit Save.</>
            : "Nothing in this filter yet."}
        </p>}
        {filtered.map((parlay) => <ParlayRow key={parlay.id} parlay={parlay} />)}
      </div>
    </section>
  </div>;
}
