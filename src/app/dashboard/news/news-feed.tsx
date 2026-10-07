"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Newspaper, Rss } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NewsItemRow } from "@/lib/types";

const filters = [
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

export function NewsFeed({ news }: { news: NewsItemRow[] }) {
  const [active, setActive] = useState("all");
  const visible = useMemo(() => news.filter((item) => active === "all" || item.topics?.includes(active)), [active, news]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter fantasy news">
        {filters.map((filter) => <button key={filter.id} type="button" role="tab" aria-selected={active === filter.id} onClick={() => setActive(filter.id)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition ${active === filter.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground"}`}>{filter.label}</button>)}
      </div>
      {visible.length ? <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((item) => {
          const topics = item.topics ?? [];
          const sourceHref = item.article_url || item.source_url || (item.source ? publisherLinks[item.source] : undefined);
          return <Card key={item.id} className="group overflow-hidden border-border/80 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
            <CardHeader className="pb-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-primary"><Newspaper className="h-3.5 w-3.5" />{item.source || "Gridiron News"}</span>
                <time className="shrink-0 text-xs text-muted" dateTime={item.item_date ?? undefined}>{displayDate(item.item_date)}</time>
              </div>
              <CardTitle className="text-lg leading-snug">
                {item.article_url ? <a href={item.article_url} target="_blank" rel="noreferrer" className="transition group-hover:text-primary">{item.headline}<ArrowUpRight className="ml-1 inline h-4 w-4 opacity-60" /></a> : item.headline}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.body && <p className="text-sm leading-6 text-foreground/80">{item.body}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <div className="flex flex-wrap gap-1.5">{topics.map((topic) => <span key={topic} className="rounded-full bg-border/40 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted">{topic.replace("_", "-")}</span>)}</div>
                {sourceHref && <a href={sourceHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"><Rss className="h-3.5 w-3.5" />{item.article_url ? "Read source" : `Visit ${item.source ?? "publisher"}`}</a>}
              </div>
            </CardContent>
          </Card>;
        })}
      </div> : <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted">No stories match this filter yet. The feed refreshes automatically when scheduled ingestion is enabled.</div>}
    </div>
  );
}
