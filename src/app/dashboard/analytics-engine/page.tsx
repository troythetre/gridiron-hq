import { Database, FlaskConical, GitBranch, Sigma } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PIPELINE_SOURCES, getModelShowcase, type PipelineSource } from "@/lib/analytics-engine";
import { MonteCarloDemo } from "./monte-carlo-demo";

function fmt(value: number | null) {
  return value == null ? "—" : value.toFixed(2);
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Database; label: string; value: string; detail?: string }) {
  return <Card><CardContent className="p-4">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted"><Icon className="h-3.5 w-3.5" />{label}</div>
    <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
    {detail && <p className="mt-1 text-[11px] text-muted">{detail}</p>}
  </CardContent></Card>;
}

const CATEGORY_ORDER: PipelineSource["category"][] = [
  "Play-by-play & tracking",
  "Derived / engineered",
  "Player & content catalog",
  "League sync",
];

function PipelineTable() {
  return <div className="space-y-5">
    {CATEGORY_ORDER.map((category) => {
      const rows = PIPELINE_SOURCES.filter((source) => source.category === category);
      if (rows.length === 0) return null;
      return <div key={category} className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">{category}</p>
        <div className="space-y-1.5">
          {rows.map((source) => <div key={source.name} className="flex flex-col gap-1 rounded-lg border border-border bg-background/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold">{source.name}</p>
              <p className="text-xs text-muted">{source.description}</p>
            </div>
            <div className="shrink-0 text-right text-xs">
              <p className="font-bold tabular-nums">{source.volume}</p>
              <p className="text-muted">{source.coverage}</p>
            </div>
          </div>)}
        </div>
      </div>;
    })}
  </div>;
}

function MaeComparisonBar({ label, value, max, accent }: { label: string; value: number; max: number; accent: string }) {
  const widthPercent = Math.min(100, (value / max) * 100);
  return <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="font-bold">{label}</span>
      <span className="tabular-nums text-muted">{value.toFixed(2)} pts MAE</span>
    </div>
    <div className="h-2.5 rounded-full bg-background/50">
      <div className={`h-2.5 rounded-full ${accent}`} style={{ width: `${widthPercent}%` }} />
    </div>
  </div>;
}

export default function AnalyticsEnginePage() {
  const model = getModelShowcase();
  const { modelMae, baselineMae, samples, seasons } = model.validation;
  const maxMae = Math.max(modelMae ?? 0, baselineMae ?? 0, 1) * 1.1;

  return <div className="mx-auto max-w-5xl space-y-6 pb-10">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Platform engineering</p>
      <h1 className="mt-1 text-2xl font-black sm:text-3xl">Data pipeline &amp; modeling</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        How the player-analysis side of this platform actually works: a multi-season NFL data pipeline feeding
        a from-scratch regression model (no ML framework - the linear algebra is hand-rolled), engineered features,
        and a Monte Carlo simulation layer. Everything below is computed live from the real pipeline, not written
        up after the fact.
      </p>
    </div>

    <div className="grid gap-3 sm:grid-cols-4">
      <StatCard icon={Database} label="Data sources ingested" value={`${PIPELINE_SOURCES.length}`} detail="nflverse, ESPN, Sleeper, and first-party scrapers" />
      <StatCard icon={GitBranch} label="Seasons of play-by-play" value="11" detail="2016–2026, ~1.37M rows across 5 nflverse datasets" />
      <StatCard icon={Sigma} label="Model holdout MAE" value={fmt(modelMae)} detail={seasons.length ? `held out on ${seasons.join(", ")}` : "awaiting validation data"} />
      <StatCard icon={FlaskConical} label="Positions modeled" value={`${model.positionsModeled}`} detail="independent ridge-regression fit per position" />
    </div>

    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-bold">Player performance model</h2>
          <p className="mt-1 text-xs text-muted">
            Position-specific ridge regression (hand-implemented Gaussian elimination + L2 penalty, not a library),
            trained on {model.baseFeatureCount} engineered features per player-week - trailing scoring average,
            opportunity share trend, snap share, and an injury-burden signal built from practice reports. Validated
            with a true holdout: the model trains on every prior season and is scored only against the most recent
            one it never saw.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <MaeComparisonBar label="Model (ridge regression)" value={modelMae ?? 0} max={maxMae} accent="bg-violet-400/80" />
            <MaeComparisonBar label="Baseline (trailing 3-game average)" value={baselineMae ?? 0} max={maxMae} accent="bg-white/30" />
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">error vs. baseline</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-emerald-200">
              {model.improvementPercent == null ? "—" : `${model.improvementPercent >= 0 ? "\u2212" : "+"}${Math.abs(model.improvementPercent).toFixed(1)}%`}
            </p>
            <p className="text-[10px] text-muted">
              {model.improvementPercent == null ? "not enough holdout data" : model.improvementPercent >= 0 ? "lower error than baseline" : "higher error than baseline"}
              {" · "}{samples} held-out player-weeks
            </p>
          </div>
        </div>
        <p className="text-[11px] leading-5 text-muted">
          A context-aware second stage is also implemented ({model.contextFeatureCount} features: home/away, game type,
          QB-chemistry, run-game share, coaching tendency, and play-calling priors like rush EPA and sack rate) and
          activates automatically once play-level context data is supplied to the trainer.
        </p>
      </CardContent>
    </Card>

    <MonteCarloDemo />

    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-bold">Data pipeline</h2>
          <p className="mt-1 text-xs text-muted">
            An R-based ETL (nflreadr) pulls raw NFL sources on a schedule, feature-engineering scripts join and
            derive new tables from them, and the results are exported as the JSON/Postgres data the Next.js app
            actually reads at request time.
          </p>
        </div>
        <PipelineTable />
      </CardContent>
    </Card>

    <Card className="border-dashed">
      <CardContent className="space-y-2 p-5">
        <h2 className="text-sm font-bold">Not in the pipeline yet</h2>
        <p className="text-xs leading-5 text-muted">
          Two specific asks come up a lot when people look at this platform, and the honest answer is the data
          isn&apos;t there yet rather than something approximated:
        </p>
        <ul className="list-disc space-y-1.5 pl-4 text-xs leading-5 text-muted">
          <li><strong className="text-foreground">Offensive formation / personnel grouping</strong> - which personnel package and alignment a player lines up in on a given snap.</li>
          <li><strong className="text-foreground">Defensive coverage scheme faced</strong> - man vs. zone, and which specific coverage, on a given snap.</li>
        </ul>
        <p className="text-xs leading-5 text-muted">
          nflreadr&apos;s public play-by-play (this pipeline&apos;s source) doesn&apos;t carry per-play formation or
          coverage tags - that level of charting is tracked by the league&apos;s own Next Gen Stats program and by
          paid charting services (PFF and similar), neither of which this pipeline has access to. Snap share, target
          share, air-yards share, and WOPR/RACR - the usage signals this pipeline <em>can</em> back with real data -
          are already surfaced on every player&apos;s profile instead of standing in for what formation/coverage
          would show.
        </p>
      </CardContent>
    </Card>
  </div>;
}
