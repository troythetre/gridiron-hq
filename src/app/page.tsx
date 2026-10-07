import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { Trophy, Swords, Users2, Siren, Newspaper, ShieldAlert } from "lucide-react";

const FEATURES = [
  { icon: Trophy, title: "Rankings", body: "Live positional and overall rankings built from real weekly scoring." },
  { icon: Swords, title: "Start/Sit", body: "A transparent engine scores any two players and explains why one wins." },
  { icon: Users2, title: "Manage Your Team", body: "Build a roster, set your lineup, and see it validated slot by slot." },
  { icon: Siren, title: "Waiver Wire", body: "The week's top pickups, ranked by opportunity, not just name recognition." },
  { icon: Newspaper, title: "Fantasy News", body: "Short, sourced blurbs on what actually moves your lineup." },
  { icon: ShieldAlert, title: "Injury Tracker", body: "Status, context, and who steps in next - color-coded by severity." },
];

export default function Home() {
  return (
    <div className="flex-1">
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/">
          <Logo height={36} />
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/stadium-hero.jpg"
            alt=""
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-background" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-24 text-center sm:px-10 sm:pt-24 sm:pb-32">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Your fantasy football <span className="text-primary">command center.</span>
          </h1>
          <p className="mt-5 text-lg text-neutral-200">
            Rankings, start/sit calls, waiver targets, injuries, and your whole roster -
            in one fast, no-nonsense dashboard. Free to use, any league, any team.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Create your free account</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">I already have one</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-6 pb-20 sm:px-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="mb-2 h-6 w-6 text-primary" strokeWidth={1.75} />
                <CardTitle>{f.title}</CardTitle>
                <CardDescription>{f.body}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </section>

      <footer className="px-6 pb-10 text-center text-sm text-muted sm:px-10">
        Built with Next.js, Supabase, and a custom scoring engine.
      </footer>
    </div>
  );
}
