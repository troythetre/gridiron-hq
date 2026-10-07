"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Play, Video } from "lucide-react";
import type { FantasyVideoRow } from "@/lib/types";

const filters = [
  { id: "all", label: "Latest" }, { id: "ppr", label: "PPR" }, { id: "half_ppr", label: "Half-PPR" },
  { id: "dynasty", label: "Dynasty" }, { id: "start_sit", label: "Start / Sit" }, { id: "waiver", label: "Waivers" },
];

function published(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Recently published" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function FantasyVideoFeed({ videos }: { videos: FantasyVideoRow[] }) {
  const [filter, setFilter] = useState("all");
  const visible = useMemo(() => videos.filter((video) => filter === "all" || video.topics?.includes(filter)), [videos, filter]);
  return <section className="space-y-5">
    <div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`shrink-0 border px-4 py-2 text-[10px] font-black uppercase tracking-wider transition ${filter === item.id ? "border-white bg-white text-black" : "border-border bg-surface text-muted hover:border-white/30 hover:text-white"}`}>{item.label}</button>)}</div>
    {visible.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((video) => <article key={video.video_id} className="group overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-white/25 hover:bg-surface-raised">
      <a href={video.watch_url} target="_blank" rel="noreferrer" className="relative block aspect-video overflow-hidden bg-black" style={{ backgroundImage: `linear-gradient(0deg,rgba(0,0,0,.45),rgba(0,0,0,.05)),url("https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg")`, backgroundPosition: "center", backgroundSize: "cover" }} aria-label={`Watch ${video.title} on YouTube`}>
        <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/65 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">{video.channel_title}</span>
        <span className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-xl transition group-hover:scale-105"><Play className="ml-0.5 h-4 w-4 fill-current" /></span>
      </a>
      <div className="p-4"><div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted"><span>{published(video.published_at)}</span><span className="flex gap-1">{(video.topics ?? []).slice(0, 2).map((topic) => <span key={topic} className="rounded-full border border-white/10 px-2 py-0.5">{topic.replace("_", "-")}</span>)}</span></div>
        <h2 className="line-clamp-2 text-base font-bold leading-6"><a href={video.watch_url} target="_blank" rel="noreferrer" className="hover:text-white/75">{video.title}</a></h2>
        {video.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{video.description}</p>}
        <a href={video.watch_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-white/75 hover:text-white">Watch on YouTube <ArrowUpRight className="h-3.5 w-3.5" /></a>
      </div>
    </article>)}</div> : <div className="rounded-2xl border border-dashed border-border py-16 text-center"><Video className="mx-auto h-9 w-9 text-muted" /><p className="mt-3 font-semibold">{videos.length ? "No videos match this filter" : "No videos in this feed yet"}</p><p className="mt-1 text-sm text-muted">{videos.length ? "Try another topic." : "Connect the YouTube API key and run the scheduled Fantasy Feed refresh."}</p></div>}
  </section>;
}
