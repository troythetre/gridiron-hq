import { cn } from "@/lib/utils";

const POS_COLORS: Record<string, string> = {
  QB: "bg-white/[.08] text-white",
  RB: "bg-white/[.08] text-white",
  WR: "bg-white/[.08] text-white",
  TE: "bg-white/[.08] text-white",
  K: "bg-white/[.08] text-white",
  DST: "bg-white/[.08] text-white",
};

export function PosBadge({ pos, className }: { pos: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded-full border border-white/10 px-1.5 text-xs font-semibold",
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
