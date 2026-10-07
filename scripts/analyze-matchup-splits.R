#!/usr/bin/env Rscript

# Build receiver-level descriptive splits by coverage, blitz, and personnel.
# These are historical associations, not causal effects or pregame predictions.

args <- commandArgs(trailingOnly = TRUE)
seasons_arg <- if (length(args) > 0) args[[1]] else "2022:2025"

# Parse seasons argument into a vector of integers
parse_seasons <- function(value) {
  if (grepl("^[0-9]{4}:[0-9]{4}$", value)) {
    # If the value is a range like "2022:2025", split it into two integers and create a sequence
    bounds <- as.integer(strsplit(value, ":", fixed = TRUE)[[1]])
    # Check that the bounds are valid
    if (length(bounds) != 2 || anyNA(bounds) || bounds[1] > bounds[2]) {
      stop("Use a range like 2022:2025 or years like 2023,2024.")
    }
    # Return a sequence of years from the start to the end of the range
    return(seq(bounds[[1]], bounds[[2]]))
  }

  # If the value is a comma-separated list of years, split it into integers
  seasons <- suppressWarnings(as.integer(strsplit(value, ",", fixed = TRUE)[[1]]))
  # Check that the seasons are valid
  if (length(seasons) == 0 || anyNA(seasons)) stop("Use a range like 2022:2025 or years like 2023,2024.")
  unique(seasons)
}

script_arg <- grep("^--file=", commandArgs(), value = TRUE)
if (length(script_arg) == 0) stop("Run this file with Rscript so its location can be resolved.")
script_path <- sub("^--file=", "", script_arg[[1]])
repo_root <- normalizePath(file.path(dirname(script_path), ".."), mustWork = TRUE)
local_r_lib <- file.path(repo_root, ".Rlib")
if (dir.exists(local_r_lib)) .libPaths(c(local_r_lib, .libPaths()))

if (!requireNamespace("dplyr", quietly = TRUE)) {
  stop("Install dplyr first with install.packages('dplyr', lib = '.Rlib').")
}

raw_dir <- file.path(repo_root, "data", "nflverse", "raw")
output_dir <- file.path(repo_root, "data", "nflverse", "derived")
dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)

read_source <- function(dataset, season) {
  path <- file.path(raw_dir, sprintf("%s_%s.rds", dataset, season))
  if (!file.exists(path)) return(NULL)
  readRDS(path)
}

play_rows <- list()
for (season in parse_seasons(seasons_arg)) {
  pbp <- read_source("pbp", season)
  participation <- read_source("participation", season)
  charting <- read_source("ftn_charting", season)

  if (is.null(pbp) || is.null(participation)) {
    message(sprintf("Skipping %s: play by play or participation data is missing.", season))
    next
  }

  # Check that the required columns are present in the PBP data
  required_pbp <- c("game_id", "play_id", "season", "week", "season_type", "posteam", "defteam",
                    "receiver_player_id", "receiver_player_name", "pass_attempt", "complete_pass",
                    "yards_gained", "pass_touchdown", "air_yards")
  missing_pbp <- setdiff(required_pbp, names(pbp))
  if (length(missing_pbp) > 0) {
    stop(sprintf("PBP season %s is missing columns: %s", season, paste(missing_pbp, collapse = ", ")))
  }

  # Check that the required columns are present in the participation data
  targets <- dplyr::filter(
    pbp,
    season_type == "REG",
    pass_attempt == 1,
    !is.na(receiver_player_id)
  ) |>
    dplyr::transmute(
      game_id, play_id, season, week, offense_team = posteam, defense_team = defteam,
      player_id = receiver_player_id, player_name = receiver_player_name,
      target = 1L, reception = as.integer(complete_pass == 1),
      receiving_yards = ifelse(complete_pass == 1, yards_gained, 0),
      receiving_td = as.integer(pass_touchdown == 1), air_yards
    )

  matchup <- participation |>
    dplyr::transmute(
      game_id = nflverse_game_id, play_id,
      offense_personnel, defense_personnel, defense_man_zone_type,
      defense_coverage_type, number_of_pass_rushers, was_pressure
    )
  targets <- dplyr::left_join(targets, matchup, by = c("game_id", "play_id"))

  # Check that the required columns are present in the charting data
  if (!is.null(charting)) {
    ftn <- charting |>
      dplyr::transmute(
        game_id = nflverse_game_id, play_id = nflverse_play_id,
        ftn_blitzers = n_blitzers, ftn_pass_rushers = n_pass_rushers,
        is_play_action, is_motion, is_screen_pass, is_rpo
      )
    targets <- dplyr::left_join(targets, ftn, by = c("game_id", "play_id"))
  } else {
    targets$ftn_blitzers <- NA_real_
    targets$ftn_pass_rushers <- NA_real_
    targets$is_play_action <- NA
    targets$is_motion <- NA
    targets$is_screen_pass <- NA
    targets$is_rpo <- NA
  }

# Create a blitz bucket variable to categorize plays based on the number of blitzers
  targets$blitz_bucket <- ifelse(
    is.na(targets$ftn_blitzers), "UNKNOWN",
    ifelse(targets$ftn_blitzers > 0, "BLITZ", "NO_BLITZ")
  )
  for (field in c("offense_personnel", "defense_personnel", "defense_man_zone_type", "defense_coverage_type")) {
    targets[[field]][is.na(targets[[field]]) | targets[[field]] == ""] <- "UNKNOWN"
  }
  play_rows[[as.character(season)]] <- targets
}

if (length(play_rows) == 0) stop("No complete seasons found. Run scripts/fetch-nfl-data.R first.")

# Combine all the play rows into a single data frame and compute the splits
target_plays <- dplyr::bind_rows(play_rows)
splits <- target_plays |>
  dplyr::group_by(
    season, player_id, player_name, offense_team, defense_team,
    defense_man_zone_type, defense_coverage_type, blitz_bucket,
    offense_personnel, defense_personnel
  ) |>
  dplyr::summarise(
    targets = sum(target),
    receptions = sum(reception),
    receiving_yards = sum(receiving_yards),
    receiving_tds = sum(receiving_td),
    average_air_yards = mean(air_yards, na.rm = TRUE),
    yards_per_target = ifelse(targets > 0, receiving_yards / targets, NA_real_),
    catch_rate = ifelse(targets > 0, receptions / targets, NA_real_),
    .groups = "drop"
  )

summarise_splits <- function(data, grouping_fields) {
  data |>
    dplyr::group_by(dplyr::across(dplyr::all_of(grouping_fields))) |>
    dplyr::summarise(
      season_start = min(season),
      season_end = max(season),
      targets = sum(target),
      receptions = sum(reception),
      receiving_yards = sum(receiving_yards),
      receiving_tds = sum(receiving_td),
      average_air_yards = mean(air_yards, na.rm = TRUE),
      yards_per_target = ifelse(targets > 0, receiving_yards / targets, NA_real_),
      catch_rate = ifelse(targets > 0, receptions / targets, NA_real_),
      .groups = "drop"
    )
}

outputs <- list(
  receiver_matchup_splits = splits,
  receiver_coverage_splits = summarise_splits(target_plays, c(
    "player_id", "player_name", "defense_man_zone_type", "defense_coverage_type"
  )),
  receiver_blitz_splits = summarise_splits(target_plays, c(
    "player_id", "player_name", "blitz_bucket"
  )),
  receiver_personnel_splits = summarise_splits(target_plays, c(
    "player_id", "player_name",
    "offense_personnel", "defense_personnel"
  )),
  team_personnel_splits = summarise_splits(target_plays, c(
    "offense_team", "defense_team", "offense_personnel", "defense_personnel"
  ))
)

for (output_name in names(outputs)) {
  output_path <- file.path(output_dir, paste0(output_name, ".csv"))
  utils::write.csv(outputs[[output_name]], output_path, row.names = FALSE, na = "")
  message(sprintf("Wrote %s groups to %s", nrow(outputs[[output_name]]), output_path))
}
