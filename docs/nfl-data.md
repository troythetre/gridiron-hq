# NFL data pipeline

This repo now has a local research-data pipeline. It downloads nflverse datasets to `data/nflverse/`, which is git-ignored because the files are large. It does not write downloaded data to Supabase or change the live start/sit recommendation.

## Install and fetch

Install R, then install the data packages into a project-local library once:

```sh
mkdir -p .Rlib
Rscript -e '.libPaths(".Rlib"); install.packages(c("nflreadr", "dplyr"), lib = ".Rlib")'
```

Fetch the 2016–2026 seasons (or pass a range / comma-separated years):

```sh
Rscript scripts/fetch-nfl-data.R 2016:2026
```

The fetcher saves one compressed RDS file per season and dataset under `data/nflverse/raw/`, plus a manifest with row counts and fetch status. If an upstream dataset has not published a season yet, the fetcher records it as unavailable and continues.

Datasets fetched:

- Weekly player stats for fantasy outcomes and usage.
- Play by play for targets, receiving yards, air yards, touchdowns, and game context.
- Play participation for offensive and defensive personnel, coverage family and shell, pressure, and pass rushers.
- Next Gen Stats receiving metrics such as separation, when available.
- FTN play charting from 2022 onward, including blitz counts, play action, motion, screens, and RPO flags.

## Build coverage, blitz, and personnel splits

After fetching, create a receiver-level CSV:

```sh
Rscript scripts/analyze-matchup-splits.R 2022:2025
```

Outputs in `data/nflverse/derived/`:

- `receiver_coverage_splits.csv`: receiver splits by man/zone and coverage shell.
- `receiver_blitz_splits.csv`: player target outcomes on blitzed vs. non-blitzed plays.
- `receiver_personnel_splits.csv`: player splits by offensive and defensive personnel.
- `team_personnel_splits.csv`: team-vs-team outcomes by offensive and defensive personnel.
- `receiver_matchup_splits.csv`: detailed cross-tab of the available contexts.

Summary files aggregate across the requested seasons and include the first/last season in the sample. The detailed cross-tab retains each season. Each includes target count, catch rate, receiving yards per target, receiving touchdowns, and average air yards. Keep target counts beside every rate; small samples are noisy. These are descriptive historical splits and should not be interpreted as causal effects or as a complete pregame matchup projection.

## Route metric limitation

The public participation data has a `route` field for the primary receiver on a play, but it does not give a reliable count of every route run by every eligible receiver. That means these public sources are enough for yards per target and coverage splits, but not a defensible yards-per-route-run denominator. Do not label yards per target as YPRR. For true YPRR, add a licensed source that reports route participation / routes run per player and game, then join it by stable NFL player ID, season, and week.

Potential paid sources to evaluate for route-level data include [PFF Premium Stats/API access](https://www.pff.com/subscribe) and [Fantasy Points Data](https://fantasypointsdata.com/). Confirm that the plan includes export/API access and that the license permits your intended storage and use before wiring one into the pipeline.

## Source and attribution notes

- Play by play, weekly stats, and Next Gen Stats downloads are served by the [nflverse data repository](https://github.com/nflverse/nflverse-data).
- Participation data before 2023 is credited to NFL Next Gen Stats via nflverse. From 2023 onward, it is supplied by FTN Data via nflverse under CC BY-SA 4.0; attribution is required.
- FTN charting is provided under CC BY-SA 4.0 and should be attributed to FTN Data via nflverse.

The upstream data can be revised. Keep the fetch manifest with research runs and refetch historical files when beginning a new model version. For model validation, split by time (train on earlier weeks/seasons and evaluate on later ones) so future results do not leak into features.

## Refresh profile bio and weekly logs

The app uses a compact JSON file for player profile bios and current-season game logs. After fetching a season, refresh it with:

```sh
Rscript scripts/export-player-profiles.R 2026
```

This writes `src/data/player-profiles.json`, matching players by NFL GSIS ID where weekly stats are available. The profile hero prefers the supplied player images in `public/player-avatars/`, then uses the official headshot URL from nflverse; the generated jersey avatar is always shown as the player identity mark.
