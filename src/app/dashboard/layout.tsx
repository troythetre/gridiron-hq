import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { GridironAssistant } from "@/components/gridiron-assistant";
import {
  LayoutDashboard, Trophy, Swords, Users2, Siren, Newspaper, ShieldAlert, LogOut, Search, ChartCandlestick, MessagesSquare, Video,
  RefreshCw, ArrowLeftRight, ClipboardList,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/rankings", label: "Rankings", icon: Trophy },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/market", label: "Player Market", icon: ChartCandlestick },
  { href: "/dashboard/start-sit", label: "Start/Sit", icon: Swords },
  { href: "/dashboard/leagues", label: "My Team", icon: Users2 },
  { href: "/dashboard/team-review", label: "Team Review", icon: ClipboardList },
  { href: "/dashboard/trades", label: "Trades", icon: ArrowLeftRight },
  { href: "/dashboard/sync", label: "Sync", icon: RefreshCw },
  { href: "/dashboard/waiver", label: "Waiver Wire", icon: Siren },
  { href: "/dashboard/news", label: "News", icon: Newspaper },
  { href: "/dashboard/fantasy-feed", label: "Fantasy Feed", icon: Video },
  { href: "/dashboard/community", label: "The Huddle", icon: MessagesSquare },
  { href: "/dashboard/messages", label: "Messages", icon: MessagesSquare },
  { href: "/dashboard/injuries", label: "Injuries", icon: ShieldAlert },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email ?? "Guest";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 flex-col border-r border-border bg-surface px-4 py-6 sm:flex">
        <Link href="/dashboard" className="mb-8 px-2">
          <Logo height={34} />
        </Link>
        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-border/40 hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-4">
          <p className="truncate px-2 text-sm font-medium">{displayName}</p>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="mt-1 w-full justify-start gap-2 text-muted">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="flex flex-1 flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:hidden">
          <Link href="/dashboard">
            <Logo height={26} />
          </Link>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-2 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-border/40"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
      <GridironAssistant />
    </div>
  );
}
