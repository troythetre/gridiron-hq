import { getInjuries } from "@/lib/data";
import { PosBadge, StatusBadge } from "@/components/pos-badge";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_ORDER = ["OUT", "DOUBTFUL", "QUESTIONABLE", "MONITOR"];

export default async function InjuriesPage() {
  const injuries = await getInjuries();
  const sorted = [...injuries].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Injury Tracker</h1>
        <p className="text-sm text-muted">Most severe first - hand-researched, with sources.</p>
      </div>

      <div className="space-y-3">
        {sorted.map((i) => (
          <Card key={i.id}>
            <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <PosBadge pos={i.pos ?? "?"} />
                <div>
                  <p className="font-medium">
                    {i.name} <span className="text-sm text-muted">· {i.team}</span>
                  </p>
                  <p className="text-sm text-muted">{i.injury}</p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <StatusBadge status={i.status} />
                <p className="max-w-md text-xs text-muted sm:text-right">{i.note}</p>
                {i.source && <p className="text-xs text-muted/70">{i.source}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {sorted.length === 0 && (
          <p className="py-8 text-center text-muted">No injuries on file right now.</p>
        )}
      </div>
    </div>
  );
}
