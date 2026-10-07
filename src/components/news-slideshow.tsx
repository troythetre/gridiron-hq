"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play, Rss } from "lucide-react";
import type { NewsItemRow } from "@/lib/types";

function storyUrl(item: NewsItemRow): string | null {
  for (const value of [item.article_url, item.source_url]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    } catch {
      continue;
    }
  }
  return null;
}

function displayDate(value: string | null) {
  if (!value) return "Recent";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function NewsSlideshow({ news }: { news: NewsItemRow[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (news.length < 2 || paused || hovered || focused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % news.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [activeIndex, focused, hovered, news.length, paused]);

  if (news.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
        The latest headlines will appear here when the news feed is available.
      </div>
    );
  }

  const item = news[activeIndex];
  const href = storyUrl(item);
  const changeSlide = (direction: number) => {
    setActiveIndex((index) => (index + direction + news.length) % news.length);
  };

  return (
    <div
      className="overflow-hidden rounded-3xl border border-border bg-surface"
      role="region"
      aria-roledescription="carousel"
      aria-label="Latest fantasy news"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
    >
      <article
        key={item.id}
        className="grid min-h-[300px] lg:min-h-[350px] lg:grid-cols-[1.05fr_0.95fr]"
        aria-roledescription="slide"
        aria-label={`${activeIndex + 1} of ${news.length}`}
      >
        <div className="relative min-h-[210px] overflow-hidden bg-gradient-to-br from-surface-raised via-background to-surface lg:order-2 lg:min-h-full">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <NewspaperMark />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent lg:bg-gradient-to-r lg:from-surface/30 lg:to-transparent" />
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-8 lg:order-1 lg:p-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-black uppercase tracking-[.16em] text-primary">
            <span className="inline-flex items-center gap-1.5"><Rss className="h-3.5 w-3.5" />{item.source || "Gridiron News"}</span>
            <span className="text-muted">{displayDate(item.item_date)}</span>
          </div>
          <h3 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">{item.headline}</h3>
          {item.body && <p className="mt-3 line-clamp-3 text-sm leading-6 text-foreground/75">{item.body}</p>}
          {item.topics && item.topics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {item.topics.slice(0, 3).map((topic) => (
                <span key={topic} className="rounded-full border border-border bg-background/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted">
                  {topic.replaceAll("_", "-")}
                </span>
              ))}
            </div>
          )}
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-fit items-center gap-2 text-sm font-bold text-primary hover:underline"
            >
              Read story <ArrowUpRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </article>

      {news.length > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          <div className="flex items-center gap-1.5" aria-label="Choose a news story">
            {news.map((story, index) => (
              <button
                key={story.id}
                type="button"
                aria-label={`Show story ${index + 1}: ${story.headline}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-6 bg-primary" : "w-2.5 bg-muted/40 hover:bg-muted"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
              onClick={() => setPaused((value) => !value)}
              className="rounded-full p-2 text-muted transition hover:bg-border/50 hover:text-foreground"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => changeSlide(-1)}
              className="rounded-full p-2 text-muted transition hover:bg-border/50 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next story"
              onClick={() => changeSlide(1)}
              className="rounded-full p-2 text-muted transition hover:bg-border/50 hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewspaperMark() {
  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-border bg-surface/80 text-primary">
      <Rss className="h-10 w-10" />
    </div>
  );
}
