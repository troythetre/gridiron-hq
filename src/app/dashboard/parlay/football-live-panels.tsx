"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, ShieldHalf, Sparkles, Trophy, TrendingDown, TrendingUp } from "lucide-react";
import { cfbLogoUrl } from "@/lib/cfb-logos";
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

type Rivalry = {
  name: string;
  teams: string;
  teamA: string;
  teamB: string;
  history: string;
  record: string;
  trophy: string;
  facts: string[];
  link: string;
  category: RivalryCategory;
};

const rivalries: Rivalry[] = [
  {
    name: "The Game",
    teams: "Michigan vs. Ohio State",
    teamA: "Michigan",
    teamB: "Ohio State",
    history: "First played in 1897, this late-season Big Ten matchup has repeatedly carried conference and national-title stakes. The winner earns bragging rights across one of college football's most enduring rivalries.",
    record: "Michigan leads the all-time series 62-52-6 (Ohio State leads 52-50-4 in Big Ten-only games).",
    trophy: "No traveling trophy - Ohio State awards players a \"gold pants\" pendant for beating Michigan, a tradition dating to 1934.",
    facts: [
      "2024: Michigan won 13-10 as 20.5-point underdogs, the biggest point-spread upset in series history.",
      "1950 \"Snow Bowl\": Michigan won 9-3 in a blizzard without completing a single pass or picking up a first down.",
    ],
    link: "https://en.wikipedia.org/wiki/The_Game_(American_football)",
    category: "Historic",
  },
  {
    name: "Iron Bowl",
    teams: "Alabama vs. Auburn",
    teamA: "Alabama",
    teamB: "Auburn",
    history: "The in-state rivalry began in 1893, paused for several decades, and resumed in 1948. Its close finishes and the 2013 Kick Six have made it one of the SEC's defining annual games.",
    record: "Alabama leads the all-time series 52-37-1.",
    trophy: "The Foy-ODK Sportsmanship Trophy.",
    facts: [
      "2013 \"Kick Six\": Auburn's Chris Davis returned a missed 57-yard field goal 109 yards for a touchdown to beat #1 Alabama 34-28.",
      "2023: Alabama won 27-24 on a 4th-and-goal touchdown with 32 seconds left.",
    ],
    link: "https://en.wikipedia.org/wiki/Iron_Bowl",
    category: "Historic",
  },
  {
    name: "Red River Rivalry",
    teams: "Texas vs. Oklahoma",
    teamA: "Texas",
    teamB: "Oklahoma",
    history: "First played in 1900, the rivalry is staged at the Cotton Bowl during the State Fair of Texas in Dallas. The neutral-site setting gives the annual meeting a festival atmosphere alongside major conference stakes.",
    record: "Texas leads the all-time series 65-51-5 across 121 meetings.",
    trophy: "The Golden Hat - a gold ten-gallon cowboy hat, plus a student-exchanged rivalry trophy and a governors' trophy.",
    facts: [
      "2001 \"Superman Play\": a deflected pass off Oklahoma's Roy Williams turned into a touchdown.",
      "2021: Oklahoma overcame a 21-point first-quarter deficit to win 55-48, the highest-scoring game in series history.",
    ],
    link: "https://en.wikipedia.org/wiki/Red_River_Rivalry",
    category: "Historic",
  },
  {
    name: "Army–Navy Game",
    teams: "Army vs. Navy",
    teamA: "Army",
    teamB: "Navy",
    history: "First played in 1890, this annual service-academy matchup is known for its pageantry, shared traditions, and national attention. The game is usually held near the end of the regular season.",
    record: "Navy leads the all-time series 64-55-7 (Navy won the 2025 meeting 17-16).",
    trophy: "The Secretary's Trophy, and the final leg of the three-team Commander-in-Chief's Trophy (with Air Force).",
    facts: [
      "2016: Army beat Navy 21-17, ending a 14-game Navy winning streak.",
      "2022: Army won 20-17 in double overtime - the series' first-ever overtime game.",
    ],
    link: "https://en.wikipedia.org/wiki/Army%E2%80%93Navy_Game",
    category: "Historic",
  },
  {
    name: "Backyard Brawl",
    teams: "Pittsburgh vs. West Virginia",
    teamA: "Pittsburgh",
    teamB: "West Virginia",
    history: "The series dates to 1895 and is one of the sport's classic regional rivalries. After a long interruption, the teams renewed the matchup in 2022, bringing the old in-state-and-neighbor-state edge back to the schedule.",
    record: "Pittsburgh leads the all-time football series 63-42-3.",
    trophy: "The Old Ironsides Trophy (1951) was originally shared three ways with Penn State and has been missing since 1984.",
    facts: [
      "1921: the Pitt-WVU game was the first college football game ever broadcast on radio.",
      "2007: unranked Pitt (4-7) upset #2 West Virginia 13-9 in the 100th meeting, knocking WVU out of the BCS title game.",
    ],
    link: "https://en.wikipedia.org/wiki/Backyard_Brawl",
    category: "Historic",
  },
  {
    name: "Clean, Old-Fashioned Hate",
    teams: "Georgia vs. Georgia Tech",
    teamA: "Georgia",
    teamB: "Georgia Tech",
    history: "The Atlanta-versus-Athens rivalry began in 1893. The schools' close geography, contrasting identities, and long run of annual meetings keep it central to the state's football calendar.",
    record: "Georgia leads the all-time series 73-41-5.",
    trophy: "The Governor's Cup.",
    facts: [
      "2024: Georgia Tech led 17-0 at halftime in Athens before Georgia won 44-42 in 8 overtimes, the longest game in series history.",
      "1943: Georgia Tech's 48-0 win is the largest margin in the series, played during WWII roster shortages.",
    ],
    link: "https://en.wikipedia.org/wiki/Clean,_Old-Fashioned_Hate",
    category: "Historic",
  },
  {
    name: "Florida–Miami",
    teams: "Florida vs. Miami",
    teamA: "Florida",
    teamB: "Miami",
    history: "Their series began in 1938, but the matchup became a national event during the programs' rise in the 1980s and 1990s. It is a high-profile in-state clash, though it has not been an annual game in recent decades.",
    record: "Miami leads the all-time series 31-27.",
    trophy: "The Florida Cup (a round-robin with Florida State); Miami also displays the historic Seminole War Canoe Trophy in its Hall of Fame.",
    facts: [
      "1983: Florida routed Miami 28-3 as 3.5-point underdogs - Miami's only loss in its national-title season.",
      "1984: Miami trailed 20-19 late before winning 32-20 on a Tolbert Bain pick-six as time expired.",
    ],
    link: "https://en.wikipedia.org/wiki/Florida%E2%80%93Miami_football_rivalry",
    category: "Modern or revived",
  },
  {
    name: "Lone Star Showdown",
    teams: "Texas vs. Texas A&M",
    teamA: "Texas",
    teamB: "Texas A&M",
    history: "This long-running state rivalry returned to the regular-season schedule in 2024 after the schools had not met since 2011. Conference alignment brought the familiar matchup back with renewed stakes.",
    record: "Texas leads the all-time football series 78-37-5.",
    trophy: "No standalone football trophy; a combined-sports \"Lone Star Showdown\" trophy was last awarded in 2011-12.",
    facts: [
      "1941: unranked Texas upset #2 Texas A&M 23-0 in College Station.",
      "The series returned in 2024 after an 11-year gap once both schools landed in the SEC together.",
    ],
    link: "https://en.wikipedia.org/wiki/Lone_Star_Showdown",
    category: "Modern or revived",
  },
  {
    name: "War on I-4",
    teams: "UCF vs. South Florida",
    teamA: "UCF",
    teamB: "South Florida",
    history: "A newer in-state rivalry built around nearby campuses and conference competition. The series has had pauses as conference schedules changed, so its future frequency depends on the teams' schedules.",
    record: "South Florida leads the overall all-sports series 326-288-10; UCF leads the football-only conference-era series.",
    trophy: "Two traveling trophies - an overall \"War on I-4\" road-sign trophy and a separate football-specific trophy.",
    facts: [
      "UCF won the last-scheduled football meeting 46-39 in 2022 before departing for the Big 12.",
      "No football game has been scheduled since UCF left the AAC, so the series' future is uncertain.",
    ],
    link: "https://en.wikipedia.org/wiki/War_on_I-4",
    category: "Modern or revived",
  },
  {
    name: "Colorado–Nebraska",
    teams: "Colorado vs. Nebraska",
    teamA: "Colorado",
    teamB: "Nebraska",
    history: "A former Big Eight and Big 12 conference matchup with a long history, this rivalry has gained fresh attention as conference realignment renewed meetings. Whether it becomes a regular annual fixture again remains to be seen.",
    record: "Nebraska leads the all-time series 50-21-2.",
    trophy: "\"Mr. Chips,\" a mounted bison head traded by student societies from 1951-1962 (discontinued since).",
    facts: [
      "1986: Colorado beat Nebraska 20-10, ending an 18-game Nebraska winning streak.",
      "2001: Colorado routed #2 Nebraska 62-36, a result often cited as the end of the Nebraska dynasty era.",
    ],
    link: "https://en.wikipedia.org/wiki/Colorado%E2%80%93Nebraska_football_rivalry",
    category: "Modern or revived",
  },
  {
    name: "Playoff-era showdown",
    teams: "Alabama vs. Georgia",
    teamA: "Alabama",
    teamB: "Georgia",
    history: "Repeated high-stakes SEC Championship and College Football Playoff meetings have made this a major modern matchup. It is not a traditional annual rivalry, but recent title races have given it a rivalry-like edge.",
    record: "Alabama leads the series 45-27-4 across 76 meetings.",
    trophy: "None - the rivalry is nicknamed \"The Standard.\"",
    facts: [
      "2018 CFP National Championship: Alabama overcame a 13-point deficit to win 26-23 in overtime.",
      "2024: Alabama led 28-0, Georgia rallied to lead 34-33, then Alabama won 41-34 on a late 75-yard touchdown.",
    ],
    link: "https://en.wikipedia.org/wiki/Alabama%E2%80%93Georgia_football_rivalry",
    category: "Rivalry in the making",
  },
  {
    name: "CFP heavyweight clashes",
    teams: "Alabama vs. Clemson",
    teamA: "Alabama",
    teamB: "Clemson",
    history: "A run of major College Football Playoff meetings created a memorable championship-era matchup. The teams do not meet every season, so it is best viewed as a modern postseason rivalry rather than a continuous annual series.",
    record: "Alabama leads the series 14-5.",
    trophy: "None.",
    facts: [
      "2017 CFP National Championship: Clemson beat Alabama 35-31 - its first win over Alabama since 1905.",
      "1931: Alabama's 74-7 win is the largest margin in the series.",
    ],
    link: "https://en.wikipedia.org/wiki/Alabama%E2%80%93Clemson_football_rivalry",
    category: "Rivalry in the making",
  },
];

function crestInitials(name: string) {
  const parts = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase());
  return parts.join("") || "?";
}

/*
 * A small circular team crest for the rivalry cards below, falling back to
 * initials when the college-football logo map has no match or the image
 * fails to load (see src/lib/cfb-logos.ts).
 */
function RivalryCrest({ name, size = "h-10 w-10" }: { name: string; size?: string }) {
  const [broken, setBroken] = useState(false);
  const logo = cfbLogoUrl(name);
  if (logo && !broken) {
    return (
      <div className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white p-1`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- external logo CDN, not an optimizable local asset */}
        <img src={logo} alt={`${name} logo`} className="h-full w-full object-contain" onError={() => setBroken(true)} />
      </div>
    );
  }
  return (
    <div className={`grid ${size} shrink-0 place-items-center rounded-full border border-border bg-white/[0.04] text-xs font-black text-foreground`}>
      {crestInitials(name)}
    </div>
  );
}

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
                  <div className="flex items-center gap-3">
                    <RivalryCrest name={rivalry.teamA} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted">vs</span>
                    <RivalryCrest name={rivalry.teamB} />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold">{rivalry.name}</h4>
                      <p className="mt-0.5 truncate text-xs font-semibold text-primary">{rivalry.teams}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-muted">{rivalry.history}</p>
                  <div className="grid gap-2 rounded-xl border border-border bg-background/30 p-3 sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <ShieldHalf className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <p className="text-xs leading-5 text-foreground"><span className="font-bold">Series: </span>{rivalry.record}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                      <p className="text-xs leading-5 text-foreground"><span className="font-bold">Trophy: </span>{rivalry.trophy}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {rivalry.facts.map((fact) => (
                      <p key={fact} className="flex gap-2 text-xs leading-5 text-muted">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" />
                        {fact}
                      </p>
                    ))}
                  </div>
                  <Link href={rivalry.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary">
                    Read more <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>;
      })}
      <p className="text-[11px] text-muted">Category labels are editorial, not official NCAA designations. Series records, trophies, and facts are sourced from Wikipedia and may shift by a game or two as seasons continue.</p>
    </section>
  );
}
