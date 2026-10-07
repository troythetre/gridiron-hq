import Link from "next/link";
import { getPlayers, getInjuries, getWaiverPicks, getNews } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default async function DashboardOverview() {
  const [players, injuries, waiver, news] = await Promise.all([
    getPlayers(),
    getInjuries(),
    getWaiverPicks(),
    getNews(),
  ]);

  const topPlayers = players.slice(0, 5);
  const topInjuries = injuries.slice(0, 3);
  const topWaiver = waiver.slice(0, 3);
  const latestNews = news.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted">Everything that moved this week, at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Players tracked" value={players.length} />
        <StatTile label="Active injuries" value={injuries.length} />
        <StatTile label="Waiver targets" value={waiver.length} />
        <StatTile label="News items" value={news.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Top overall</CardTitle>
              <CardDescription>By season half-PPR points</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/rankings">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-border/20">
                <div className="flex items-center gap-2">
                  <PosBadge pos={p.pos} />
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted">{p.team}</span>
                </div>
                <span className="text-sm font-semibold">{p.total_pts.toFixed(1)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Injury watch</CardTitle>
              <CardDescription>Most severe first</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/injuries">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {topInjuries.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-border/20">
                <div className="flex items-center gap-2">
                  <PosBadge pos={i.pos ?? "?"} />
                  <span className="text-sm font-medium">{i.name}</span>
                  <span className="text-xs text-muted">{i.injury}</span>
                </div>
                <StatusBadge status={i.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Top waiver pickups</CardTitle>
              <CardDescription>Ranked by estimated % rostered</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/waiver">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {topWaiver.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-border/20">
                <div className="flex items-center gap-2">
                  <PosBadge pos={w.pos ?? "?"} />
                  <span className="text-sm font-medium">{w.name}</span>
                  <span className="text-xs text-muted">{w.team}</span>
                </div>
                <span className="text-xs text-muted">{w.pct_rostered_est}% rostered</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Latest news</CardTitle>
              <CardDescription>Short, sourced blurbs</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/news">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {latestNews.map((n) => (
              <div key={n.id} className="rounded-md px-2 py-1.5 hover:bg-border/20">
                <p className="text-sm font-medium">{n.headline}</p>
                <p className="text-xs text-muted">{n.item_date}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </CardContent>
    </Card>
  );
}
