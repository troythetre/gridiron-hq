import { getWaiverPicks } from "@/lib/data";
import { PosBadge } from "@/components/pos-badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function WaiverPage() {
  const picks = await getWaiverPicks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Waiver Wire</h1>
        <p className="text-sm text-muted">This week&apos;s top pickups, ranked by estimated rostership.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {picks.map((w, idx) => (
          <Card key={w.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted">#{idx + 1}</span>
                  <PosBadge pos={w.pos ?? "?"} />
                  <div>
                    <p className="font-medium">{w.name}</p>
                    <p className="text-xs text-muted">{w.team}</p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  ~{w.pct_rostered_est}% rostered
                </span>
              </div>
              <p className="mt-3 text-sm text-muted">{w.note}</p>
              {w.source && <p className="mt-2 text-xs text-muted/70">{w.source}</p>}
            </CardContent>
          </Card>
        ))}
        {picks.length === 0 && (
          <p className="col-span-full py-8 text-center text-muted">No waiver picks on file right now.</p>
        )}
      </div>
    </div>
  );
}
