import Link from "next/link";
import { ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import type { CollegeFootballRankings } from "@/lib/college-football-live";
import type { NflMockDraft } from "@/lib/nfl-mock-draft";
import { Card, CardContent } from "@/components/ui/card";

export function NflMockDraftPanel({ data }: { data: NflMockDraft }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Latest NFL mock draft</h2>
          <p className="mt-1 text-xs text-muted">
            {data.updated
              ? `Prospect rankings updated ${data.updated}.`
              : "Current projections from Tankathon."} Refreshes about once an hour.
          </p>
        </div>
        <Link
          href={data.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-bold text-muted hover:text-foreground"
        >
          View source <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      {data.error ? (
        <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
          The latest mock draft could not be loaded: {data.error}
        </p>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {data.picks.map((pick) => (
              <Card key={`${pick.pick}-${pick.teamAbbreviation}`}>
                <CardContent className="flex items-center gap-3 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-black text-primary">{pick.pick}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{pick.player}</span>
                    <span className="mt-1 block truncate text-[10px] text-muted">{pick.position || "—"} · {pick.college || "College TBD"}</span>
                  </span>
                  <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-black">{pick.teamAbbreviation}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="hidden md:block">
            <CardContent className="p-0">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Pick</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Prospect</th>
                  <th className="px-4 py-3">Pos</th>
                  <th className="px-4 py-3">College</th>
                </tr>
              </thead>
              <tbody>
                {data.picks.map((pick) => (
                  <tr key={`${pick.pick}-${pick.teamAbbreviation}`} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-bold text-muted">{pick.pick}</td>
                    <td className="px-4 py-3"><span className="mr-2 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">{pick.teamAbbreviation}</span>{pick.team}</td>
                    <td className="px-4 py-3 font-semibold">{pick.player}</td>
                    <td className="px-4 py-3 text-muted">{pick.position || "—"}</td>
                    <td className="px-4 py-3 text-muted">{pick.college || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </CardContent>
          </Card>
        </>
      )}
      <p className="text-[11px] leading-5 text-muted">
        Mock drafts are editorial projections, not official NFL selections or guarantees.
      </p>
    </section>
  );
}

export function CollegeRankingsPanel({ data }: { data: CollegeFootballRankings }) {
  const updatedAt = data.lastUpdated
    ? `${data.lastUpdated.replace("T", " ").replace(/Z$/, " UTC").slice(0, 23)}`
    : null;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Latest {data.poll}</h2>
          <p className="mt-1 text-xs text-muted">
            {data.headline} · {data.week}
            {updatedAt ? ` · Updated ${updatedAt}` : ""}
          </p>
        </div>
        <Link
          href={data.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-bold text-muted hover:text-foreground"
        >
          ESPN source <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      {data.error ? (
        <p role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
          The latest college rankings could not be loaded: {data.error}
        </p>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {data.teams.map((team) => {
              const change = team.previousRank == null ? null : team.previousRank - team.rank;
              return (
                <Card key={`${team.rank}-${team.team}`}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-black text-primary">{team.rank}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{team.team}</span>
                      <span className="mt-1 block text-[10px] text-muted">{team.record}</span>
                    </span>
                    {change != null && change !== 0 && <span className={`shrink-0 text-xs font-bold ${change > 0 ? "text-emerald-300" : "text-orange-300"}`}>{change > 0 ? "▲" : "▼"} {Math.abs(change)}</span>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card className="hidden md:block">
            <CardContent className="p-0">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Record</th>
                  <th className="px-4 py-3">Change</th>
                </tr>
              </thead>
              <tbody>
                {data.teams.map((team) => {
                  const change = team.previousRank == null ? null : team.previousRank - team.rank;
                  return (
                    <tr key={`${team.rank}-${team.team}`} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-black">{team.rank}</td>
                      <td className="px-4 py-3 font-semibold">{team.team}</td>
                      <td className="px-4 py-3 text-muted">{team.record}</td>
                      <td className="px-4 py-3 text-muted">
                        {change == null ? "—" : change > 0
                          ? <span className="inline-flex items-center gap-1 text-emerald-300"><TrendingUp className="h-3.5 w-3.5" />{change}</span>
                          : change < 0
                            ? <span className="inline-flex items-center gap-1 text-orange-300"><TrendingDown className="h-3.5 w-3.5" />{Math.abs(change)}</span>
                            : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </CardContent>
          </Card>
        </>
      )}
      <p className="text-[11px] leading-5 text-muted">
        Rankings are the latest available AP poll, sourced from ESPN, and refresh about once an hour.
      </p>
    </section>
  );
}

type RivalryCategory = "Historic" | "Modern or revived" | "Rivalry in the making";

const rivalries: {
  name: string;
  teams: string;
  history: string;
  link: string;
  category: RivalryCategory;
}[] = [
  {
    name: "The Game",
    teams: "Michigan vs. Ohio State",
    history: "First played in 1897, this late-season Big Ten matchup has repeatedly carried conference and national-title stakes. The winner earns bragging rights across one of college football's most enduring rivalries.",
    link: "https://en.wikipedia.org/wiki/The_Game_(American_football)",
    category: "Historic",
  },
  {
    name: "Iron Bowl",
    teams: "Alabama vs. Auburn",
    history: "The in-state rivalry began in 1893, paused for several decades, and resumed in 1948. Its close finishes and the 2013 Kick Six have made it one of the SEC's defining annual games.",
    link: "https://en.wikipedia.org/wiki/Iron_Bowl",
    category: "Historic",
  },
  {
    name: "Red River Rivalry",
    teams: "Texas vs. Oklahoma",
    history: "First played in 1900, the rivalry is staged at the Cotton Bowl during the State Fair of Texas in Dallas. The neutral-site setting gives the annual meeting a festival atmosphere alongside major conference stakes.",
    link: "https://en.wikipedia.org/wiki/Red_River_Rivalry",
    category: "Historic",
  },
  {
    name: "Army–Navy Game",
    teams: "Army vs. Navy",
    history: "First played in 1890, this annual service-academy matchup is known for its pageantry, shared traditions, and national attention. The game is usually held near the end of the regular season.",
    link: "https://en.wikipedia.org/wiki/Army%E2%80%93Navy_Game",
    category: "Historic",
  },
  {
    name: "Backyard Brawl",
    teams: "Pittsburgh vs. West Virginia",
    history: "The series dates to 1895 and is one of the sport's classic regional rivalries. After a long interruption, the teams renewed the matchup in 2022, bringing the old in-state-and-neighbor-state edge back to the schedule.",
    link: "https://en.wikipedia.org/wiki/Backyard_Brawl",
    category: "Historic",
  },
  {
    name: "Clean, Old-Fashioned Hate",
    teams: "Georgia vs. Georgia Tech",
    history: "The Atlanta-versus-Athens rivalry began in 1893. The schools' close geography, contrasting identities, and long run of annual meetings keep it central to the state's football calendar.",
    link: "https://en.wikipedia.org/wiki/Clean,_Old-Fashioned_Hate",
    category: "Historic",
  },
  {
    name: "Florida–Miami",
    teams: "Florida vs. Miami",
    history: "Their series began in 1938, but the matchup became a national event during the programs' rise in the 1980s and 1990s. It is a high-profile in-state clash, though it has not been an annual game in recent decades.",
    link: "https://en.wikipedia.org/wiki/Florida%E2%80%93Miami_football_rivalry",
    category: "Modern or revived",
  },
  {
    name: "Lone Star Showdown",
    teams: "Texas vs. Texas A&M",
    history: "This long-running state rivalry returned to the regular-season schedule in 2024 after the schools had not met since 2011. Conference alignment brought the familiar matchup back with renewed stakes.",
    link: "https://en.wikipedia.org/wiki/Lone_Star_Showdown",
    category: "Modern or revived",
  },
  {
    name: "War on I-4",
    teams: "UCF vs. South Florida",
    history: "A newer in-state rivalry built around nearby campuses and conference competition. The series has had pauses as conference schedules changed, so its future frequency depends on the teams' schedules.",
    link: "https://en.wikipedia.org/wiki/War_on_I-4",
    category: "Modern or revived",
  },
  {
    name: "Colorado–Nebraska",
    teams: "Colorado vs. Nebraska",
    history: "A former Big Eight and Big 12 conference matchup with a long history, this rivalry has gained fresh attention as conference realignment renewed meetings. Whether it becomes a regular annual fixture again remains to be seen.",
    link: "https://en.wikipedia.org/wiki/Colorado%E2%80%93Nebraska_football_rivalry",
    category: "Modern or revived",
  },
  {
    name: "Playoff-era showdown",
    teams: "Alabama vs. Georgia",
    history: "Repeated high-stakes SEC Championship and College Football Playoff meetings have made this a major modern matchup. It is not a traditional annual rivalry, but recent title races have given it a rivalry-like edge.",
    link: "https://en.wikipedia.org/wiki/Alabama%E2%80%93Georgia_football_rivalry",
    category: "Rivalry in the making",
  },
  {
    name: "CFP heavyweight clashes",
    teams: "Alabama vs. Clemson",
    history: "A run of major College Football Playoff meetings created a memorable championship-era matchup. The teams do not meet every season, so it is best viewed as a modern postseason rivalry rather than a continuous annual series.",
    link: "https://en.wikipedia.org/wiki/Alabama%E2%80%93Clemson_football_rivalry",
    category: "Rivalry in the making",
  },
];

export function RivalryHistoryPanel() {
  const categories: { name: RivalryCategory; detail: string }[] = [
    { name: "Historic", detail: "Traditions built over generations." },
    { name: "Modern or revived", detail: "New prominence, realignment, or a renewed series." },
    { name: "Rivalry in the making", detail: "High-stakes matchups that could grow into something more." },
  ];
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">College football rivalry history</h2>
        <p className="mt-1 text-xs text-muted">Historic classics, revived matchups, and new rivalries still earning their place.</p>
      </div>
      {categories.map((category) => {
        const entries = rivalries.filter((rivalry) => rivalry.category === category.name);
        return <section key={category.name} className="space-y-3">
          <div>
            <h3 className="font-display text-base font-bold uppercase tracking-wide">{category.name}</h3>
            <p className="mt-1 text-xs text-muted">{category.detail}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {entries.map((rivalry) => (
              <Card key={rivalry.name}>
                <CardContent className="space-y-3 p-5">
                  <div>
                    <h4 className="font-bold">{rivalry.name}</h4>
                    <p className="mt-1 text-xs font-semibold text-primary">{rivalry.teams}</p>
                  </div>
                  <p className="text-sm leading-6 text-muted">{rivalry.history}</p>
                  <Link href={rivalry.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary">
                    Read more <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>;
      })}
      <p className="text-[11px] text-muted">Category labels are editorial, not official NCAA designations. Historical summaries are educational; current series records are not shown.</p>
    </section>
  );
}
