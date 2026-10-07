#!/usr/bin/env Rscript

# Export the current app player list with nflverse bio data and weekly stats.

args <- commandArgs(trailingOnly = TRUE)
season <- if (length(args) > 0) as.integer(args[[1]]) else 2026L
if (is.na(season) || season < 2016) stop("Pass an NFL season from 2016 onward.")

script_arg <- grep("^--file=", commandArgs(), value = TRUE)
if (length(script_arg) == 0) stop("Run this file with Rscript so its location can be resolved.")
script_path <- sub("^--file=", "", script_arg[[1]])
repo_root <- normalizePath(file.path(dirname(script_path), ".."), mustWork = TRUE)
local_r_lib <- file.path(repo_root, ".Rlib")
if (dir.exists(local_r_lib)) .libPaths(c(local_r_lib, .libPaths()))

if (!requireNamespace("nflreadr", quietly = TRUE) || !requireNamespace("jsonlite", quietly = TRUE)) {
  stop("Install nflreadr and jsonlite first.")
}

stats_path <- file.path(repo_root, "data", "nflverse", "raw", sprintf("player_stats_week_%s.rds", season))
if (!file.exists(stats_path)) stop(sprintf("Missing %s. Run scripts/fetch-nfl-data.R %s first.", stats_path, season))

app_players <- jsonlite::fromJSON(file.path(repo_root, "src", "data", "players.json"))
weekly <- readRDS(stats_path)
bios <- nflreadr::load_players()

# Include the ranked app pool, this season's participants, and active NFL skill
# position players. This makes the local catalog useful for search and synced rosters,
# even when a player is outside the current rankings seed.
app_catalog <- data.frame(
  name = app_players$name,
  team = app_players$team,
  pos = app_players$pos,
  gsisId = NA_character_,
  stringsAsFactors = FALSE
)
weekly_catalog <- unique(weekly[weekly$season_type == "REG" & weekly$week > 0,
  c("player_display_name", "team", "position", "player_id")])
names(weekly_catalog) <- c("name", "team", "pos", "gsisId")
active_catalog <- bios[
  bios$status == "ACT" & bios$position %in% c("QB", "RB", "WR", "TE", "K") &
    !is.na(bios$latest_team) & nzchar(bios$latest_team) &
    !is.na(bios$rookie_season) & bios$rookie_season >= (season - 16L),
  c("display_name", "latest_team", "position", "gsis_id")
]
names(active_catalog) <- c("name", "team", "pos", "gsisId")
catalog <- unique(rbind(app_catalog, weekly_catalog, active_catalog))
catalog <- catalog[!is.na(catalog$name) & !is.na(catalog$team) & !is.na(catalog$pos), ]
catalog <- catalog[!duplicated(paste(tolower(catalog$name), catalog$team)), ]

value_or_null <- function(value) {
  if (length(value) == 0 || is.na(value[[1]]) || identical(value[[1]], "")) NULL else value[[1]]
}

profiles <- lapply(seq_len(nrow(catalog)), function(i) {
  player <- catalog[i, ]
  weekly_match <- weekly[
    (( !is.na(player$gsisId) & weekly$player_id == player$gsisId) |
      (weekly$player_display_name == player$name & weekly$team == player$team)) &
      weekly$season_type == "REG" & weekly$week > 0,
  ]
  weekly_match <- weekly_match[order(weekly_match$week), , drop = FALSE]
  bio_match <- if (!is.na(player$gsisId)) {
    bios[bios$gsis_id == player$gsisId, , drop = FALSE]
  } else if (nrow(weekly_match) > 0) {
    bios[bios$gsis_id == weekly_match$player_id[[1]], , drop = FALSE]
  } else {
    candidates <- bios[bios$display_name == player$name, , drop = FALSE]
    team_match <- candidates[candidates$latest_team == player$team & candidates$position == player$pos, , drop = FALSE]
    if (nrow(team_match) > 0) team_match else candidates[candidates$position == player$pos, , drop = FALSE]
  }
  bio <- if (nrow(bio_match) > 0) bio_match[1, ] else NULL

  weeks <- lapply(seq_len(nrow(weekly_match)), function(j) {
    row <- weekly_match[j, ]
    list(
      week = row$week,
      fantasyPoints = value_or_null(row$fantasy_points),
      passingYards = value_or_null(row$passing_yards),
      completions = value_or_null(row$completions),
      attempts = value_or_null(row$attempts),
      passingTds = value_or_null(row$passing_tds),
      interceptions = value_or_null(row$passing_interceptions),
      carries = value_or_null(row$carries),
      rushingYards = value_or_null(row$rushing_yards),
      rushingTds = value_or_null(row$rushing_tds),
      targets = value_or_null(row$targets),
      receptions = value_or_null(row$receptions),
      receivingYards = value_or_null(row$receiving_yards),
      receivingTds = value_or_null(row$receiving_tds),
      receivingAirYards = value_or_null(row$receiving_air_yards),
      yardsAfterCatch = value_or_null(row$receiving_yards_after_catch),
      targetShare = value_or_null(row$target_share),
      airYardsShare = value_or_null(row$air_yards_share),
      wopr = value_or_null(row$wopr),
      racr = value_or_null(row$racr)
    )
  })

  list(
    name = player$name,
    team = player$team,
    position = player$pos,
    season = season,
    gsisId = if (is.null(bio)) NULL else value_or_null(bio$gsis_id),
    jerseyNumber = if (is.null(bio)) NULL else {
      jersey <- value_or_null(bio$jersey_number)
      if (is.null(jersey)) NULL else suppressWarnings(as.integer(jersey))
    },
    headshotUrl = if (is.null(bio)) NULL else value_or_null(bio$headshot),
    birthDate = if (is.null(bio)) NULL else value_or_null(bio$birth_date),
    height = if (is.null(bio)) NULL else value_or_null(bio$height),
    weight = if (is.null(bio)) NULL else value_or_null(bio$weight),
    college = if (is.null(bio)) NULL else value_or_null(bio$college_name),
    yearsExperience = if (is.null(bio)) NULL else value_or_null(bio$years_of_experience),
    rookieSeason = if (is.null(bio)) NULL else value_or_null(bio$rookie_season),
    draftYear = if (is.null(bio)) NULL else value_or_null(bio$draft_year),
    draftRound = if (is.null(bio)) NULL else value_or_null(bio$draft_round),
    draftPick = if (is.null(bio)) NULL else value_or_null(bio$draft_pick),
    draftTeam = if (is.null(bio)) NULL else value_or_null(bio$draft_team),
    status = if (is.null(bio)) NULL else value_or_null(bio$status),
    weeks = weeks
  )
})

output_path <- file.path(repo_root, "src", "data", "player-profiles.json")
jsonlite::write_json(profiles, output_path, pretty = TRUE, auto_unbox = TRUE, na = "null", null = "null")
message(sprintf("Wrote %s profiles for %s to %s", length(profiles), season, output_path))
