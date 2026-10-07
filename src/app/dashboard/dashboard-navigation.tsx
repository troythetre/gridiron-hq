"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import {
  ArrowLeftRight,
  BarChart3,
  ChartCandlestick,
  ChevronDown,
  CircleDot,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Medal,
  MessagesSquare,
  Newspaper,
  RefreshCw,
  Search,
  ShieldAlert,
  Siren,
  Swords,
  TicketCheck,
  TrendingUp,
  Trophy,
  Users,
  Users2,
  Video,
} from "lucide-react";

type NavItem = {
  href?: string;
  label: string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
};

type NavGroup = {
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
};

const homeItem: NavItem = { href: "/dashboard", label: "Home", icon: LayoutDashboard };

const groups: NavGroup[] = [
  {
    label: "Fantasy Football",
    icon: Trophy,
    items: [
      { href: "/dashboard/leagues", label: "Team overview", icon: Users2 },
      { href: "/dashboard/market", label: "Player market", icon: ChartCandlestick },
      { href: "/dashboard/rankings", label: "Rankings", icon: Trophy },
      { href: "/dashboard/news", label: "News feed", icon: Newspaper },
      { label: "Leaderboard", icon: Medal, soon: true },
      { label: "Futures", icon: TrendingUp, soon: true },
    ],
  },
  {
    label: "NFL",
    icon: ShieldAlert,
    items: [
      { href: "/dashboard/parlay?sport=NFL", label: "Parlay Hub", icon: TicketCheck },
      { href: "/dashboard/news", label: "News", icon: Newspaper },
      { label: "Leaderboard", icon: Medal, soon: true },
      { href: "/dashboard/rankings", label: "Rankings", icon: Trophy },
      { label: "Stats", icon: BarChart3, soon: true },
      { href: "/dashboard/parlay?tab=mock-draft", label: "Latest mock draft", icon: ClipboardList },
    ],
  },
  {
    label: "CFB",
    icon: GraduationCap,
    items: [
      { href: "/dashboard/parlay?sport=CFB", label: "Parlay Hub", icon: TicketCheck },
      { label: "News", icon: Newspaper, soon: true },
      { label: "Leaderboard", icon: Medal, soon: true },
      { href: "/dashboard/parlay?tab=college", label: "Rankings", icon: Trophy },
      { label: "Stats", icon: BarChart3, soon: true },
      { label: "Transfer portal", icon: Users, soon: true },
      { href: "/dashboard/parlay?tab=rivalries", label: "Rivalry history", icon: Swords },
    ],
  },
];

const moreItems: NavItem[] = [
  { href: "/dashboard/start-sit", label: "Start/Sit", icon: Swords },
  { href: "/dashboard/team-review", label: "Team Review", icon: ClipboardList },
  { href: "/dashboard/trades", label: "Trades", icon: ArrowLeftRight },
  { href: "/dashboard/waiver", label: "Waiver Wire", icon: Siren },
  { href: "/dashboard/injuries", label: "Injuries", icon: ShieldAlert },
  { href: "/dashboard/search", label: "Player search", icon: Search },
  { href: "/dashboard/compare", label: "Compare players", icon: CircleDot },
  { href: "/dashboard/fantasy-feed", label: "Fantasy Feed", icon: Video },
  { href: "/dashboard/community", label: "The Huddle", icon: MessagesSquare },
  { href: "/dashboard/messages", label: "Messages", icon: MessagesSquare },
  { href: "/dashboard/sync", label: "Sync teams", icon: RefreshCw },
  { href: "/dashboard/membership", label: "Membership", icon: Trophy },
];

function isActive(pathname: string, href?: string) {
  if (!href) return false;
  const target = href.split("?")[0];
  return target === "/dashboard"
    ? pathname === target
    : pathname === target || pathname.startsWith(`${target}/`);
}

function hasActiveItem(pathname: string, items: NavItem[]) {
  return items.some((item) => isActive(pathname, item.href));
}

function closeOpenDisclosures() {
  const disclosures = document.querySelectorAll<HTMLDetailsElement>("[data-dashboard-disclosure][open]");
  disclosures.forEach((disclosure) => {
    disclosure.classList.add("nav-disclosure-closing");
    window.setTimeout(() => {
      disclosure.open = false;
      disclosure.classList.remove("nav-disclosure-closing");
    }, 150);
  });
}

function closeDisclosuresOnNavigation() {
  closeOpenDisclosures();
}

function ItemLink({ item, pathname, mobile = false }: { item: NavItem; pathname: string; mobile?: boolean }) {
  const active = isActive(pathname, item.href);
  const className = `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
    active
      ? "bg-primary/10 font-semibold text-primary"
      : item.soon
        ? "cursor-not-allowed text-muted/60"
        : "text-muted hover:bg-border/40 hover:text-foreground"
  } ${mobile ? "whitespace-nowrap" : ""}`;
  if (!item.href) {
    return <span className={className} aria-disabled="true"><item.icon className="h-4 w-4 shrink-0" /><span>{item.label}</span><span className="ml-auto text-[9px] font-bold uppercase tracking-wider">Soon</span></span>;
  }
  return <Link href={item.href} aria-current={active ? "page" : undefined} onClick={closeDisclosuresOnNavigation} className={className}>
    <item.icon className="h-4 w-4 shrink-0" /><span>{item.label}</span>
  </Link>;
}

function TopNavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const active = hasActiveItem(pathname, group.items);
  return <details data-dashboard-disclosure className="group/top relative">
    <summary className={`flex h-11 cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors hover:bg-white/[.06] [&::-webkit-details-marker]:hidden ${active ? "text-foreground" : "text-muted"}`}>
      <group.icon className="h-4 w-4 shrink-0 text-primary" />
      <span className="hidden md:inline">{group.label === "Fantasy Football" ? "Fantasy" : group.label}</span>
      <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-open/top:rotate-180 md:block" />
    </summary>
    <div className="nav-dropdown-panel absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-border/80 bg-surface/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
      {group.items.map((item) => <ItemLink key={item.label} item={item} pathname={pathname} />)}
    </div>
  </details>;
}

function GroupDetails({ group, pathname }: { group: NavGroup; pathname: string }) {
  const active = hasActiveItem(pathname, group.items);
  return <details data-dashboard-disclosure className="group/nav rounded-xl">
    <summary className={`flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-border/40 [&::-webkit-details-marker]:hidden ${active ? "text-foreground" : "text-muted"}`}>
      <group.icon className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{group.label}</span>
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open/nav:rotate-180" />
    </summary>
    <div className="ml-3 space-y-0.5 border-l border-border pl-2">
      {group.items.map((item) => <ItemLink key={item.label} item={item} pathname={pathname} />)}
    </div>
  </details>;
}

export function DashboardNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  if (!mobile) {
    return <nav aria-label="Dashboard navigation" className="flex-1 space-y-1 overflow-y-auto">
      <ItemLink item={homeItem} pathname={pathname} />
      {groups.map((group) => <GroupDetails key={group.label} group={group} pathname={pathname} />)}
      <details data-dashboard-disclosure className="group/nav rounded-xl">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-border/40 [&::-webkit-details-marker]:hidden">
          <CircleDot className="h-4 w-4 shrink-0 text-muted" /><span className="min-w-0 flex-1">More tools</span><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open/nav:rotate-180" />
        </summary>
        <div className="ml-3 space-y-0.5 border-l border-border pl-2">
          {moreItems.map((item) => <ItemLink key={item.label} item={item} pathname={pathname} />)}
        </div>
      </details>
    </nav>;
  }
  return <nav aria-label="Mobile dashboard navigation" className="flex flex-wrap items-center gap-1 border-b border-border bg-surface px-2 py-2">
      <ItemLink item={homeItem} pathname={pathname} mobile />
      {groups.map((group) => <details key={group.label} data-dashboard-disclosure className="group/mobile relative">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted hover:bg-border/40 [&::-webkit-details-marker]:hidden">
          <group.icon className="h-3.5 w-3.5" />{group.label}<ChevronDown className="h-3 w-3" />
        </summary>
        <div className="nav-dropdown-panel absolute left-0 top-full z-30 mt-1 max-h-[70vh] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-xl">
          {group.items.map((item) => <ItemLink key={item.label} item={item} pathname={pathname} mobile />)}
        </div>
      </details>)}
      <details data-dashboard-disclosure className="group/mobile relative">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted hover:bg-border/40 [&::-webkit-details-marker]:hidden"><CircleDot className="h-3.5 w-3.5" />More<ChevronDown className="h-3 w-3" /></summary>
        <div className="nav-dropdown-panel fixed right-3 top-24 z-50 max-h-[calc(100dvh-7rem)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-2xl shadow-black/50">
          {moreItems.map((item) => <ItemLink key={item.label} item={item} pathname={pathname} mobile />)}
        </div>
      </details>
    </nav>;
}

export function DashboardTopNavigation({ trailing }: { trailing?: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    closeOpenDisclosures();
  }, [pathname]);

  return <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5" style={{ viewTransitionName: "dashboard-header" }}>
    <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 rounded-full border border-white/15 bg-[linear-gradient(115deg,rgba(21,37,58,.78),rgba(31,25,54,.72),rgba(13,24,39,.78))] px-3 shadow-[0_12px_36px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.12)] backdrop-blur-2xl sm:h-16 sm:gap-4 sm:px-5">
      <Link href="/dashboard" onClick={closeDisclosuresOnNavigation} className="shrink-0" aria-label="Gridiron HQ home">
        <Logo height={26} />
      </Link>
      <nav aria-label="Primary navigation" className="flex min-w-0 flex-1 items-center justify-center gap-0.5 sm:gap-1">
        <Link href="/dashboard" onClick={closeDisclosuresOnNavigation} aria-current={isActive(pathname, homeItem.href) ? "page" : undefined} className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-colors hover:bg-white/[.08] sm:px-3 ${isActive(pathname, homeItem.href) ? "text-white" : "text-blue-100/65"}`}>
          <LayoutDashboard className="h-4 w-4 text-sky-200" /><span className="hidden sm:inline">Home</span>
        </Link>
        {groups.map((group) => <TopNavDropdown key={group.label} group={group} pathname={pathname} />)}
        <details data-dashboard-disclosure className="group/top relative">
          <summary aria-label="More tools" className="flex h-10 cursor-pointer list-none items-center gap-1 rounded-xl px-2 text-xs font-bold text-blue-100/65 transition-colors hover:bg-white/[.08] [&::-webkit-details-marker]:hidden sm:gap-1.5 sm:px-3">
            <CircleDot className="h-4 w-4 text-sky-200" /><span className="hidden sm:inline">More</span><ChevronDown className="hidden h-3.5 w-3.5 transition-transform duration-300 group-open/top:rotate-180 sm:block" />
          </summary>
          <div className="nav-dropdown-panel fixed right-3 top-24 z-50 max-h-[calc(100dvh-7rem)] w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/75 p-2 shadow-2xl shadow-black/40 backdrop-blur-2xl md:absolute md:right-0 md:top-full md:mt-2 md:max-h-[75vh] md:w-64">
            {moreItems.map((item) => <ItemLink key={item.label} item={item} pathname={pathname} />)}
          </div>
        </details>
      </nav>
      {trailing}
    </div>
  </header>;
}
