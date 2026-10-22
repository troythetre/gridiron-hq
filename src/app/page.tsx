import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { BrainCircuit, Trophy, TrendingUp, ShieldAlert, SwatchBook, ChartCandlestick } from "lucide-react";
import { getNews } from "@/lib/data";
import { NewsSlideshow } from "@/components/news-slideshow";

const FEATURES = [
  { icon: BrainCircuit, title: "Analytics Engine", body: "A real NFL data pipeline and a from-scratch regression model, with live holdout accuracy - open to everyone, no account needed.", href: "/dashboard/analytics-engine" },
  { icon: TrendingUp, title: "Predictions", body: "Data-driven NFL & CFB playoff pictures, award projections, and stat-leader pace, computed live from real player data.", href: "/dashboard/predictions" },
  { icon: Trophy, title: "Player Rankings", body: "Positional and overall player rankings built from real weekly production, with week-over-week trend signals.", href: "/dashboard/player-analysis?tab=rankings" },
  { icon: SwatchBook, title: "Compare Players", body: "Put any two players side by side and see where the numbers actually differ.", href: "/dashboard/player-analysis?tab=compare" },
  { icon: ChartCandlestick, title: "Player Market", body: "A trading-style production index that moves with weekly performance, practice reports, and injury news.", href: "/dashboard/player-analysis?tab=market" },
  { icon: ShieldAlert, title: "Injury Tracker", body: "Status, context, and who steps in next - color-coded by severity.", href: "/dashboard/injuries" },
];

export default async function Home() {
  const news = await getNews(5);

  return (
    <div className="flex-1">
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/">
          <Logo height={36} />
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/dashboard/analytics-engine">Analytics Engine</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="relative min-h-[520px] overflow-hidden sm:min-h-[580px]">
        <div className="absolute inset-0">
          <Image
            src="/super-bowl-hero.webp"
            alt=""
            fill
            priority
            className="object-cover object-[center_58%]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 text-center sm:px-10 sm:pt-24 sm:pb-32">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            NFL player &amp; team analytics, <span className="text-primary">built from real data.</span>
          </h1>
          <p className="mt-5 text-lg text-neutral-200">
            A real multi-season data pipeline, a from-scratch regression model with live validated accuracy, and
            data-driven playoff, award, and stat-leader predictions - rankings, injury context, and player comparisons too.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard/analytics-engine">Explore the Analytics Engine</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard/predictions">See 2026 predictions</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            Both are public, no account needed. <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover:underline">Create a free account</Link> to save parlays, build a player watchlist, and share a public profile.
          </p>
        </div>
      </section>

      <section className="px-6 py-14 sm:px-10 sm:py-18">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Around the league</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Latest NFL news</h2>
            </div>
            <Button asChild variant="ghost" className="shrink-0">
              <Link href="/dashboard/news">All news</Link>
            </Button>
          </div>
          <NewsSlideshow news={news} />
        </div>
      </section>

      <section className="px-6 pb-20 sm:px-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const content = <>
              <f.icon className="mb-2 h-6 w-6 text-primary" strokeWidth={1.75} />
              <CardTitle>{f.title}</CardTitle>
              <CardDescription>{f.body}</CardDescription>
            </>;
            return f.href
              ? <Link key={f.title} href={f.href} className="block">
                <Card className="h-full transition hover:border-primary/40">
                  <CardHeader>{content}</CardHeader>
                  <CardContent />
                </Card>
              </Link>
              : <Card key={f.title}>
                <CardHeader>{content}</CardHeader>
                <CardContent />
              </Card>;
          })}
        </div>
      </section>

      <footer className="px-6 pb-10 text-center text-sm text-muted sm:px-10">
        Built with Next.js, Supabase, an R/nflreadr data pipeline, and a hand-implemented regression model.
      </footer>
    </div>
  );
}
