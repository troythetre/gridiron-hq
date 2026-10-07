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

stats_dir <- file.path(repo_root, "data", "nflverse", "raw")
stats_path <- file.path(stats_dir, sprintf("player_stats_week_%s.rds", season))
if (!file.exists(stats_path)) stop(sprintf("Missing %s. Run scripts/fetch-nfl-data.R %s first.", stats_path, season))

app_players <- jsonlite::fromJSON(file.path(repo_root, "src", "data", "players.json"))
profile_path <- file.path(repo_root, "src", "data", "player-profiles.json")
existing_profiles <- jsonlite::fromJSON(profile_path, simplifyVector = FALSE)
weekly <- readRDS(stats_path)
history_seasons <- seq.int(max(2016L, season - 4L), season)
history_data <- lapply(history_seasons, function(year) {
  path <- file.path(stats_dir, sprintf("player_stats_week_%s.rds", year))
  if (file.exists(path)) readRDS(path) else NULL
})
names(history_data) <- history_seasons
`%||%` <- function(value, fallback) if (is.null(value) || length(value) == 0) fallback else value
bios <- tryCatch(nflreadr::load_players(), error = function(error) NULL)
if (is.null(bios) || !all(c("display_name", "latest_team", "position", "gsis_id") %in% names(bios))) {
  message("Using cached profile biographies because nflverse player records are unavailable.")
  bios <- data.frame(
    display_name = vapply(existing_profiles, `[[`, character(1), "name"),
    latest_team = vapply(existing_profiles, `[[`, character(1), "team"),
    position = vapply(existing_profiles, `[[`, character(1), "position"),
    gsis_id = vapply(existing_profiles, function(player) player$gsisId %||% NA_character_, character(1)),
    status = vapply(existing_profiles, function(player) player$status %||% NA_character_, character(1)),
    rookie_season = vapply(existing_profiles, function(player) as.integer(player$rookieSeason %||% NA_integer_), integer(1)),
    jersey_number = vapply(existing_profiles, function(player) as.integer(player$jerseyNumber %||% NA_integer_), integer(1)),
    headshot = vapply(existing_profiles, function(player) player$headshotUrl %||% NA_character_, character(1)),
    birth_date = vapply(existing_profiles, function(player) player$birthDate %||% NA_character_, character(1)),
    height = vapply(existing_profiles, function(player) as.numeric(player$height %||% NA_real_), numeric(1)),
    weight = vapply(existing_profiles, function(player) as.numeric(player$weight %||% NA_real_), numeric(1)),
    college_name = vapply(existing_profiles, function(player) player$college %||% NA_character_, character(1)),
    years_of_experience = vapply(existing_profiles, function(player) as.integer(player$yearsExperience %||% NA_integer_), integer(1)),
    draft_year = vapply(existing_profiles, function(player) as.integer(player$draftYear %||% NA_integer_), integer(1)),
    draft_round = vapply(existing_profiles, function(player) as.integer(player$draftRound %||% NA_integer_), integer(1)),
    draft_pick = vapply(existing_profiles, function(player) as.integer(player$draftPick %||% NA_integer_), integer(1)),
    draft_team = vapply(existing_profiles, function(player) player$draftTeam %||% NA_character_, character(1)),
    stringsAsFactors = FALSE
  )
}


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

player_weeks <- function(weekly_data, player, gsis_id = NULL) {
  if (is.null(weekly_data) || nrow(weekly_data) == 0) return(list())
  player_id <- if (!is.null(gsis_id) && !is.na(gsis_id) && nzchar(gsis_id)) gsis_id else player$gsisId
  matches_id <- !is.na(player_id) & weekly_data$player_id == player_id
  matches_name <- weekly_data$player_display_name == player$name & weekly_data$team == player$team
  rows <- weekly_data[(matches_id | matches_name) & weekly_data$season_type == "REG" & weekly_data$week > 0, , drop = FALSE]
  rows <- rows[order(rows$week), , drop = FALSE]
  lapply(seq_len(nrow(rows)), function(j) {
    row <- rows[j, ]
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

  gsis_id <- if (is.null(bio)) NULL else value_or_null(bio$gsis_id)
  weeks <- player_weeks(weekly, player, gsis_id)
  history <- lapply(names(history_data), function(year) {
    year_weeks <- player_weeks(history_data[[year]], player, gsis_id)
    trend_weeks <- lapply(year_weeks, function(week) week[c("week", "fantasyPoints", "rushingYards", "receivingYards", "targetShare", "airYardsShare")])
    list(season = as.integer(year), weeks = trend_weeks)
  })
  history <- Filter(function(item) length(item$weeks) > 0, history)

  list(
    name = player$name,
    team = player$team,
    position = player$pos,
    season = season,
    gsisId = gsis_id,
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
    weeks = weeks,
    history = history
  )
})

output_path <- file.path(repo_root, "src", "data", "player-profiles.json")
jsonlite::write_json(profiles, output_path, pretty = TRUE, auto_unbox = TRUE, na = "null", null = "null")
message(sprintf("Wrote %s profiles for %s to %s", length(profiles), season, output_path))
