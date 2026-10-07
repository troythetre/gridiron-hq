"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Newspaper, Rss, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NewsItemRow } from "@/lib/types";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";

const filters = [
  { id: "my_team", label: "My Players" },
  { id: "all", label: "All News" },
  { id: "players", label: "Players" },
  { id: "teams", label: "Teams" },
  { id: "fantasy", label: "Fantasy" },
  { id: "ppr", label: "PPR" },
  { id: "half_ppr", label: "Half-PPR" },
  { id: "dynasty", label: "Dynasty" },
];

const publisherLinks: Record<string, string> = {
  ESPN: "https://www.espn.com/nfl/",
  "NFL.com": "https://www.nfl.com/news/",
  FantasyPros: "https://www.fantasypros.com/",
};

function displayDate(value: string | null) {
  if (!value) return "Recent";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

const topicColors: Record<string, string> = {
  injury: "border-red-500/30 bg-red-500/10 text-red-300",
  practice: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  players: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  teams: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  fantasy: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
  ppr: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  half_ppr: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  dynasty: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

export function NewsFeed({ news, teamPlayerNames }: { news: NewsItemRow[]; teamPlayerNames: string[] }) {
  const [active, setActive] = useState(teamPlayerNames.length ? "my_team" : "all");
  const [selected, setSelected] = useState<NewsItemRow | null>(null);
  const [query, setQuery] = useState("");
  const { visible, teamPlayerMatches } = useMemo(() => {
    const names = [...new Set(teamPlayerNames.map(normalizeName).filter((name) => name.length > 3))];
    const matches = new Map<number, string[]>();
    for (const item of news) {
      const text = normalizeName(`${item.headline} ${item.body ?? ""}`);
      const found = names.filter((name) => text.includes(name));
      if (found.length) matches.set(item.id, found);
    }
    const ordered = [...news].sort((a, b) => {
      const personalized = Number(matches.has(b.id)) - Number(matches.has(a.id));
      return personalized || (new Date(b.item_date ?? 0).getTime() - new Date(a.item_date ?? 0).getTime());
    });
    return {
      visible: ordered.filter((item) => {
        const topicMatch = active === "my_team" ? matches.has(item.id) : active === "all" || item.topics?.includes(active);
        const keywordMatch = !query.trim() || normalizeName(`${item.headline} ${item.body ?? ""} ${item.source ?? ""}`).includes(normalizeName(query));
        return topicMatch && keywordMatch;
      }),
      teamPlayerMatches: matches,
    };
  }, [active, news, teamPlayerNames, query]);

  return (
    <div className="space-y-5">
      <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 focus-within:border-primary/50"><Search className="h-4 w-4 shrink-0 text-muted" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search headlines, players, teams, or sources..." aria-label="Search news keywords" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" /><span className="shrink-0 text-[10px] text-muted">{visible.length} stories</span></label>
      <div className="flex flex-wrap gap-2 pb-1" role="tablist" aria-label="Filter fantasy news">
        {filters.map((filter) => <button key={filter.id} type="button" role="tab" aria-selected={active === filter.id} onClick={() => setActive(filter.id)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition ${active === filter.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"}`}>{filter.label}</button>)}
      </div>
      {active === "my_team" && teamPlayerNames.length > 0 && <p className="text-xs text-muted">Prioritizing stories that mention a player on your synced rosters.</p>}
      {visible.length ? <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((item) => {
          const topics = item.topics ?? [];
          const onTeam = teamPlayerMatches.has(item.id);
          return <button key={item.id} type="button" onClick={() => setSelected(item)} aria-label={`Read summary: ${item.headline}`} className="block w-full rounded-[var(--radius)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
            <Card className="group h-full overflow-hidden border-border/80 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
            {item.image_url && <div className="relative aspect-[16/8] overflow-hidden bg-background"><Image src={item.image_url} alt="" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" /></div>}
            <CardHeader className="pb-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-primary"><Newspaper className="h-3.5 w-3.5" />{item.source || "Gridiron News"}{onTeam && <span className="rounded-full bg-primary/10 px-2 py-1 tracking-wide">Your team</span>}</span>
                <time className="shrink-0 text-xs text-muted" dateTime={item.item_date ?? undefined}>{displayDate(item.item_date)}</time>
              </div>
              <CardTitle className="text-lg leading-snug">
                <span className="transition group-hover:text-primary">{item.headline}<ArrowUpRight className="ml-1 inline h-4 w-4 opacity-60" /></span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.body && <p className="text-sm leading-6 text-foreground/80">{item.body}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <div className="flex flex-wrap gap-1.5">{topics.map((topic) => <span key={topic} className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${topicColors[topic] ?? "border-border bg-border/40 text-muted"}`}>{topic.replace("_", "-")}</span>)}</div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary"><Rss className="h-3.5 w-3.5" />Open story</span>
              </div>
            </CardContent>
            </Card>
          </button>;
        })}
      </div> : <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted">{active === "my_team" ? "No recent stories matched players on your synced rosters. Check All News for broader coverage." : "No stories match this filter yet. The feed refreshes automatically when scheduled ingestion is enabled."}</div>}
      <Dialog.Root open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-border bg-surface p-6 shadow-2xl focus:outline-none sm:p-8">
            {selected && <>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-primary"><Newspaper className="h-4 w-4" />{selected.source || "Gridiron News"}</p>
                  <Dialog.Title className="text-2xl font-bold leading-tight">{selected.headline}</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm text-muted">{displayDate(selected.item_date)}</Dialog.Description>
                </div>
                <Dialog.Close aria-label="Close story" className="rounded-full border border-border p-2 text-muted hover:text-foreground"><X className="h-4 w-4" /></Dialog.Close>
              </div>
              <div className="space-y-4 text-sm leading-7 text-foreground/85">
                <p className="font-semibold text-foreground">Story summary</p>
                <p>{selected.body || "A summary is not available for this story yet. Open the publisher article for the full report."}</p>
              </div>
              {!!selected.topics?.length && <div className="mt-5 flex flex-wrap gap-2">{selected.topics.map((topic) => <span key={topic} className="rounded-full bg-border/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">{topic.replace("_", "-")}</span>)}</div>}
              <div className="mt-7 flex justify-end border-t border-border pt-5">
                {sourceHrefFor(selected) ? <a href={sourceHrefFor(selected)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90">Read more <ArrowUpRight className="h-4 w-4" /></a> : <Dialog.Close className="rounded-full border border-border px-5 py-3 text-sm font-semibold">Close</Dialog.Close>}
              </div>
            </>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function normalizeName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sourceHrefFor(item: NewsItemRow) {
  return item.article_url || item.source_url || (item.source ? publisherLinks[item.source] : undefined);
}
