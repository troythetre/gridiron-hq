import { cn } from "@/lib/utils";

const POS_COLORS: Record<string, string> = {
  QB: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  RB: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  WR: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  TE: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  K: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  DST: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

export function PosBadge({ pos, className }: { pos: string; className?: string }) {
  const normalizedPos = pos.toUpperCase() === "DEF" || pos.toUpperCase() === "D/ST" ? "DST" : pos.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded-full border border-white/10 px-1.5 text-xs font-semibold",
        POS_COLORS[normalizedPos] ?? "bg-border/40 text-foreground",
        className
      )}
    >
      {pos}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  OUT: "bg-danger/10 text-danger",
  DOUBTFUL: "bg-danger/10 text-danger",
  QUESTIONABLE: "bg-warning/10 text-warning",
  MONITOR: "bg-warning/10 text-warning",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        STATUS_COLORS[status] ?? "bg-border/40 text-foreground"
      )}
    >
      {status}
    </span>
  );
}
