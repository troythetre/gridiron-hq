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
      <div className="rounded-3xl border border-red-500/20 bg-[linear-gradient(135deg,#3b1015,#19090c_70%)] p-6 sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[.2em] text-red-300">Player health report</p>
        <h1 className="mt-2 text-3xl font-black text-red-50 sm:text-4xl">Injury Tracker</h1>
        <p className="mt-2 text-sm text-red-100/70">Most severe first · hand-researched, with sources.</p>
      </div>

      <div className="space-y-3">
        {sorted.map((i) => (
          <Card key={i.id} className="border-red-950/30 shadow-sm shadow-red-950/10">
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
