import { cn } from "@/lib/utils";

const POS_COLORS: Record<string, string> = {
  QB: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  RB: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  WR: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  TE: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  K: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  DST: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

export function PosBadge({ pos, className }: { pos: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded-md px-1.5 text-xs font-semibold",
        POS_COLORS[pos] ?? "bg-border/40 text-foreground",
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
