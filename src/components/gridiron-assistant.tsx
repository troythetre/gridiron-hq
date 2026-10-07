"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, ChevronRight, Search, Swords, ClipboardList, Siren, Newspaper, X, GraduationCap } from "lucide-react";
import type { CollegeFootballRankings } from "@/lib/college-football-live";

const actions = [
  { label: "Find a player", detail: "Search the player catalog", href: "/dashboard/search", icon: Search },
  { label: "Set my lineup", detail: "Compare your start/sit options", href: "/dashboard/start-sit", icon: Swords },
  { label: "Review my team", detail: "See strengths and roster gaps", href: "/dashboard/team-review", icon: ClipboardList },
  { label: "Find waiver targets", detail: "Browse available pickups", href: "/dashboard/waiver", icon: Siren },
  { label: "Catch up on news", detail: "Latest league updates", href: "/dashboard/news", icon: Newspaper },
];

export function GridironAssistant({ collegeRankings }: { collegeRankings: CollegeFootballRankings }) {
  const [open, setOpen] = useState(false);
  const currentPoll = collegeRankings.teams[0]
    ? `${collegeRankings.week}: No. 1 ${collegeRankings.teams[0].team}`
    : collegeRankings.error
      ? "AP poll temporarily unavailable"
      : "Latest AP Top 25";
  const assistantActions = [
    ...actions,
    { label: "Latest college rankings", detail: currentPoll, href: "/dashboard/parlay?tab=college", icon: GraduationCap },
  ];
  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <section className="mb-3 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-primary/30 bg-surface shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/15 to-transparent p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Bot className="h-5 w-5" /></span>
              <div><p className="font-display text-sm font-bold">GRIDBOT</p><p className="text-xs text-muted">Your fantasy quick desk</p></div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close GridBot" className="rounded-lg p-2 text-muted hover:bg-border/50"><X className="h-4 w-4" /></button>
          </div>
          <div className="p-2">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-muted">What are we working on?</p>
            {assistantActions.map(({ label, detail, href, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-primary/10">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="block truncate text-xs text-muted">{detail}</span></span>
                <ChevronRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
          <p className="border-t border-border px-4 py-2.5 text-[10px] text-muted">Quick links powered by your Gridiron HQ data</p>
        </section>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close GridBot" : "Open GridBot assistant"} className="ml-auto flex items-center gap-2 rounded-full border border-primary/40 bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:scale-[1.03]">
        {open ? <X className="h-4 w-4" /> : <Bot className="h-5 w-5" />}{open ? "Close" : "GRIDBOT"}
      </button>
    </div>
  );
}
