import Link from "next/link";
import { Crown, Flame, Medal, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Sample bettors for the preview layout below. These are placeholder
// handles, not real Gridiron HQ members - live rankings will replace this
// once enough bettors have tracked and settled parlays through My Account.
const PLACEHOLDER_BOARD = [
  { handle: "ChalkEater_99", gradient: "from-amber-400 to-orange-500", net: 2140, winRate: 64, logged: 38, streak: 5 },
  { handle: "SharpShooterHQ", gradient: "from-violet-400 to-fuchsia-500", net: 1865, winRate: 59, logged: 52, streak: 3 },
  { handle: "UnderdogUpside", gradient: "from-sky-400 to-blue-600", net: 1510, winRate: 55, logged: 29, streak: 4 },
  { handle: "ParlayKingATL", gradient: "from-emerald-400 to-teal-600", net: 1120, winRate: 51, logged: 44, streak: 2 },
  { handle: "LongshotLarry", gradient: "from-rose-400 to-red-600", net: 940, winRate: 48, logged: 33, streak: 1 },
  { handle: "GridironGrinder", gradient: "from-indigo-400 to-purple-600", net: 705, winRate: 50, logged: 21, streak: 2 },
  { handle: "JuiceBoxJenna", gradient: "from-cyan-400 to-sky-600", net: 510, winRate: 47, logged: 18, streak: 1 },
];

const PODIUM_STYLES = [
  { ring: "border-amber-300/60", badge: "bg-amber-400 text-black", icon: Crown, label: "1st" },
  { ring: "border-slate-300/50", badge: "bg-slate-300 text-black", icon: Medal, label: "2nd" },
  { ring: "border-orange-400/50", badge: "bg-orange-400 text-black", icon: Medal, label: "3rd" },
];

function initials(handle: string) {
  return handle.replace(/[^A-Za-z0-9]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

export default function LeaderboardPage() {
  const [podium, rest] = [PLACEHOLDER_BOARD.slice(0, 3), PLACEHOLDER_BOARD.slice(3)];

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="relative isolate overflow-hidden rounded-3xl border border-amber-300/20 bg-[linear-gradient(135deg,#1a1308,#190f24_55%,#0d0c16)] p-6 sm:p-9">
      <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-400/15 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
      <p className="relative text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Bettor leaderboard</p>
      <h1 className="relative mt-2 font-display text-4xl font-black uppercase tracking-tight sm:text-6xl">The Sharp Board</h1>
      <p className="relative mt-3 max-w-2xl text-sm leading-6 text-muted">Gridiron HQ&apos;s ranking of its sharpest parlay bettors — net winnings, win rate, and the longest active hot streaks.</p>
      <div className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200">
        <Sparkles className="h-3.5 w-3.5" />Preview — these are sample rankings. Live standings turn on once bettors start settling parlays in My Account.
      </div>
    </header>

    <div className="grid gap-3 sm:grid-cols-3">
      {podium.map((bettor, index) => {
        const style = PODIUM_STYLES[index];
        const Icon = style.icon;
        return <Card key={bettor.handle} className={`overflow-hidden border-2 ${style.ring} bg-[linear-gradient(160deg,rgba(255,255,255,.05),transparent)]`}>
          <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${style.badge}`}><Icon className="h-3.5 w-3.5" />{style.label}</span>
            <span className={`mt-1 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br ${bettor.gradient} text-xl font-black text-white shadow-lg`}>{initials(bettor.handle)}</span>
            <p className="mt-1 text-sm font-black">{bettor.handle}</p>
            <p className="text-2xl font-black tabular-nums text-emerald-300">+${bettor.net.toLocaleString()}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Net winnings</p>
            <div className="mt-2 flex gap-4 text-xs text-muted">
              <span><span className="font-black text-foreground">{bettor.winRate}%</span> win rate</span>
              <span><span className="font-black text-foreground">{bettor.logged}</span> logged</span>
            </div>
          </CardContent>
        </Card>;
      })}
    </div>

    <Card><CardContent className="p-2 sm:p-3">
      <div className="divide-y divide-border">
        {rest.map((bettor, index) => <div key={bettor.handle} className="flex items-center gap-3 p-3">
          <span className="w-6 shrink-0 text-center text-sm font-black text-muted">{index + 4}</span>
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${bettor.gradient} text-xs font-black text-white`}>{initials(bettor.handle)}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-bold">{bettor.handle}</span>
          <span className="hidden shrink-0 items-center gap-1 text-xs text-muted sm:flex"><Flame className="h-3.5 w-3.5 text-orange-300" />{bettor.streak} win streak</span>
          <span className="hidden w-16 shrink-0 text-right text-xs text-muted sm:block">{bettor.winRate}% WR</span>
          <span className="w-20 shrink-0 text-right text-sm font-black tabular-nums text-emerald-300">+${bettor.net.toLocaleString()}</span>
        </div>)}
      </div>
    </CardContent></Card>

    <Card className="border-violet-400/20 bg-violet-400/[.04]"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 shrink-0 text-violet-300" />
        <p className="text-sm text-muted">Track your own parlays and settle your results to start climbing the board.</p>
      </div>
      <Link href="/dashboard/account" className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-xs font-black text-primary-foreground">Go to My Account</Link>
    </CardContent></Card>
  </div>;
}
