"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarDays,
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
      { href: "/dashboard/parlay?tab=mock-draft", label: "Mock draft", icon: ClipboardList },
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
      { label: "Rivalry & bowl tracker", icon: CalendarDays, soon: true },
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
  return <Link href={item.href} aria-current={active ? "page" : undefined} className={className}>
    <item.icon className="h-4 w-4 shrink-0" /><span>{item.label}</span>
  </Link>;
}

function GroupDetails({ group, pathname }: { group: NavGroup; pathname: string }) {
  const active = hasActiveItem(pathname, group.items);
  return <details className="group/nav rounded-xl">
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
      <details className="group/nav rounded-xl">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-border/40 [&::-webkit-details-marker]:hidden">
          <CircleDot className="h-4 w-4 shrink-0 text-muted" /><span className="min-w-0 flex-1">More tools</span><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open/nav:rotate-180" />
        </summary>
        <div className="ml-3 space-y-0.5 border-l border-border pl-2">
          {moreItems.map((item) => <ItemLink key={item.label} item={item} pathname={pathname} />)}
        </div>
      </details>
    </nav>;
  }
  return <nav aria-label="Mobile dashboard navigation" className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-2">
      <ItemLink item={homeItem} pathname={pathname} mobile />
      {groups.map((group) => <details key={group.label} className="group/mobile relative shrink-0">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted hover:bg-border/40 [&::-webkit-details-marker]:hidden">
          <group.icon className="h-3.5 w-3.5" />{group.label}<ChevronDown className="h-3 w-3" />
        </summary>
        <div className="absolute left-0 top-full z-30 mt-1 max-h-[70vh] min-w-56 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-xl">
          {group.items.map((item) => <ItemLink key={item.label} item={item} pathname={pathname} mobile />)}
        </div>
      </details>)}
      <details className="group/mobile relative shrink-0">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted hover:bg-border/40 [&::-webkit-details-marker]:hidden"><CircleDot className="h-3.5 w-3.5" />More<ChevronDown className="h-3 w-3" /></summary>
        <div className="absolute right-0 top-full z-30 mt-1 max-h-[70vh] min-w-56 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-xl">
          {moreItems.map((item) => <ItemLink key={item.label} item={item} pathname={pathname} mobile />)}
        </div>
      </details>
    </nav>;
}
