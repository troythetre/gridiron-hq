#!/usr/bin/env Rscript

# Export leak-safe historical context features for the NFL fantasy model.
# Blocking is represented only by team rushing efficiency; these public data do
# not measure an individual running back's blocking skill.

script_arg <- grep("^--file=", commandArgs(), value = TRUE)
if (length(script_arg) == 0) stop("Run this file with Rscript so its location can be resolved.")
script_path <- sub("^--file=", "", script_arg[[1]])
repo_root <- normalizePath(file.path(dirname(script_path), ".."), mustWork = TRUE)
local_r_lib <- file.path(repo_root, ".Rlib")
if (dir.exists(local_r_lib)) .libPaths(c(local_r_lib, .libPaths()))

for (package in c("nflreadr", "data.table", "jsonlite")) {
  if (!requireNamespace(package, quietly = TRUE)) {
    stop(sprintf("Install %s in the project R library before exporting model context.", package))
  }
}

`%||%` <- function(value, fallback) if (is.null(value) || length(value) == 0) fallback else value

raw_dir <- file.path(repo_root, "data", "nflverse", "raw")
profile_path <- file.path(repo_root, "src", "data", "player-profiles.json")
output_path <- file.path(repo_root, "src", "data", "nfl-model-context.json")
profiles <- jsonlite::fromJSON(profile_path, simplifyVector = FALSE)
player_ids <- unique(vapply(profiles, function(profile) profile$gsisId %||% NA_character_, character(1)))
player_ids <- player_ids[!is.na(player_ids) & nzchar(player_ids)]
if (length(player_ids) == 0) stop("No NFL GSIS player IDs are available in player-profiles.json.")

years <- 2016:as.integer(format(Sys.Date(), "%Y"))
read_raw <- function(dataset, season) {
  path <- file.path(raw_dir, sprintf("%s_%s.rds", dataset, season))
  if (!file.exists(path)) return(NULL)
  readRDS(path)
}

pbp_rows <- lapply(years, function(year) read_raw("pbp", year))
stats_rows <- lapply(years, function(year) read_raw("player_stats_week", year))
pbp_rows <- Filter(Negate(is.null), pbp_rows)
stats_rows <- Filter(Negate(is.null), stats_rows)
if (length(pbp_rows) == 0 || length(stats_rows) == 0) {
  stop("NFL play-by-play or weekly player stats are missing. Run scripts/fetch-nfl-data.R first.")
}

data.table::setDTthreads(1)
pbp <- data.table::rbindlist(pbp_rows, fill = TRUE, use.names = TRUE)
stats <- data.table::rbindlist(stats_rows, fill = TRUE, use.names = TRUE)
rm(pbp_rows, stats_rows)
required_pbp <- c(
  "game_id", "season", "week", "season_type", "game_date", "posteam", "defteam",
  "home_team", "away_team", "home_coach", "away_coach", "down", "play_type",
  "pass_attempt", "rush_attempt", "qb_dropback", "sack", "epa", "success",
  "passer_player_id", "receiver_player_id", "complete_pass", "receiving_yards"
)
missing_pbp <- setdiff(required_pbp, names(pbp))
if (length(missing_pbp)) stop(sprintf("NFL play-by-play is missing columns: %s", paste(missing_pbp, collapse = ", ")))
required_stats <- c(
  "player_id", "position", "season", "week", "season_type", "game_id", "team",
  "opponent_team", "carries", "targets", "fantasy_points"
)
missing_stats <- setdiff(required_stats, names(stats))
if (length(missing_stats)) stop(sprintf("NFL weekly stats are missing columns: %s", paste(missing_stats, collapse = ", ")))

pbp[, game_date := as.Date(game_date)]
pbp[, is_pass_target := !is.na(receiver_player_id) & pass_attempt == 1]
pbp[, is_offensive_play := play_type %in% c("run", "pass", "qb_spike", "qb_kneel")]
game_rows <- pbp[!is.na(posteam) & !is.na(game_date)]
team_games <- game_rows[, .(
  season = season[1],
  week = week[1],
  game_type = season_type[1],
  game_date = game_date[1],
  team = posteam[1],
  opponent = defteam[1],
  is_home = posteam[1] == home_team[1],
  coach = if (posteam[1] == home_team[1]) home_coach[1] else away_coach[1],
  fourth_down_plays = sum(down == 4 & is_offensive_play, na.rm = TRUE),
  fourth_down_go = sum(down == 4 & (pass_attempt == 1 | rush_attempt == 1), na.rm = TRUE),
  rush_plays = sum(rush_attempt == 1, na.rm = TRUE),
  rush_epa_total = sum(epa[rush_attempt == 1], na.rm = TRUE),
  rush_success_total = sum(success[rush_attempt == 1], na.rm = TRUE),
  qb_dropbacks = sum(qb_dropback == 1, na.rm = TRUE),
  sacks = sum(sack == 1, na.rm = TRUE),
  by = .(game_id, posteam)
)]
data.table::setnames(team_games, "posteam", "team")
team_games[, `:=`(
  go_rate = data.table::fifelse(fourth_down_plays > 0, fourth_down_go / fourth_down_plays, NA_real_),
  rush_epa = data.table::fifelse(rush_plays > 0, rush_epa_total / rush_plays, NA_real_),
  rush_success = data.table::fifelse(rush_plays > 0, rush_success_total / rush_plays, NA_real_),
  sack_rate = data.table::fifelse(qb_dropbacks > 0, sacks / qb_dropbacks, NA_real_)
)]
data.table::setorder(team_games, team, game_date, game_id)
team_games[, team_game_index := seq_len(.N), by = team]
team_games[, `:=`(prior_go_rate = NA_real_, prior_rush_epa = NA_real_,
                   prior_rush_success = NA_real_, prior_sack_rate = NA_real_,
                   prior_coach_go_rate = NA_real_, expected_qb_id = NA_character_)]

for (team in unique(team_games$team)) {
  indices <- which(team_games$team == team)
  for (index in indices) {
    recent <- tail(indices[indices < index], 3)
    team_games$prior_go_rate[index] <- if (length(recent)) mean(team_games$go_rate[recent], na.rm = TRUE) else NA_real_
    team_games$prior_rush_epa[index] <- if (length(recent)) mean(team_games$rush_epa[recent], na.rm = TRUE) else NA_real_
    team_games$prior_rush_success[index] <- if (length(recent)) mean(team_games$rush_success[recent], na.rm = TRUE) else NA_real_
    team_games$prior_sack_rate[index] <- if (length(recent)) mean(team_games$sack_rate[recent], na.rm = TRUE) else NA_real_
  }
}

# Coach tendencies use only earlier games, including earlier seasons.
data.table::setorder(team_games, game_date, game_id, team)
coach_rows <- which(!is.na(team_games$coach) & nzchar(team_games$coach))
for (coach in unique(team_games$coach[coach_rows])) {
  indices <- coach_rows[team_games$coach[coach_rows] == coach]
  prior_go <- 0
  prior_plays <- 0
  for (index in indices) {
    team_games$prior_coach_go_rate[index] <- if (prior_plays > 0) prior_go / prior_plays else NA_real_
    prior_go <- prior_go + team_games$fourth_down_go[index]
    prior_plays <- prior_plays + team_games$fourth_down_plays[index]
  }
}

# Choose the primary passer from the immediately preceding team game.
passer_counts <- game_rows[pass_attempt == 1 & !is.na(passer_player_id),
  .(pass_attempts = .N), by = .(game_id, posteam, passer_player_id)]
data.table::setorder(passer_counts, game_id, posteam, -pass_attempts, passer_player_id)
primary_passers <- passer_counts[, .SD[1], by = .(game_id, posteam)]
data.table::setnames(primary_passers, c("posteam", "passer_player_id"), c("team", "primary_qb_id"))
team_games[primary_passers, on = .(game_id, team), expected_qb_id := i.primary_qb_id]
data.table::setorder(team_games, team, game_date, game_id)
team_games[, expected_qb_id := data.table::shift(expected_qb_id), by = team]

# QB/receiver connection statistics use only target plays from games before the
# forecast game. Rates are shrunk toward league averages until enough targets exist.
pair_games <- pbp[is_pass_target & !is.na(passer_player_id),
  .(targets = .N, catches = sum(complete_pass == 1, na.rm = TRUE),
    yards = sum(receiving_yards, na.rm = TRUE)),
  by = .(game_id, game_date, season, week, season_type, team = posteam,
         passer_id = passer_player_id, receiver_id = receiver_player_id)]
data.table::setorder(pair_games, game_date, game_id)
data.table::setkey(pair_games, team, receiver_id, passer_id, game_date)
qb_games <- pair_games[, .(
  targets = sum(targets),
  catches = sum(catches),
  yards = sum(yards)
), by = .(game_id, game_date, team, passer_id)]
data.table::setkey(qb_games, team, passer_id, game_date)
pair_games[, connection := NA_real_]
league_ypt <- if (nrow(pair_games)) sum(pair_games$yards, na.rm = TRUE) / max(1, sum(pair_games$targets, na.rm = TRUE)) else 7
league_catch <- if (nrow(pair_games)) sum(pair_games$catches, na.rm = TRUE) / max(1, sum(pair_games$targets, na.rm = TRUE)) else 0.65

connection_for <- function(target_row, qb_id, is_qb = FALSE) {
  if (is.na(qb_id) || !nzchar(qb_id)) return(NA_real_)
  if (is_qb) {
    earlier <- qb_games[J(target_row$team, qb_id), nomatch = 0]
  } else {
    earlier <- pair_games[J(target_row$team, target_row$player_id, qb_id), nomatch = 0]
  }
  earlier <- earlier[game_date < target_row$game_date]
  if (!nrow(earlier)) return(NA_real_)
  prior_dates <- unique(tail(sort(unique(earlier$game_date)), 6))
  recent <- earlier[game_date %in% prior_dates]
  targets <- sum(recent$targets)
  ypt <- sum(recent$yards) / max(1, targets)
  catch_rate <- sum(recent$catches) / max(1, targets)
  weight <- targets / (targets + 8)
  weight * (0.5 * (ypt - league_ypt) / max(league_ypt, 1) +
    0.5 * (catch_rate - league_catch) / max(league_catch, 0.1))
}

all_stats <- stats[season_type %in% c("REG", "POST") & !is.na(game_id) & !is.na(team)]
stats <- all_stats[player_id %in% player_ids]
stats[, game_type := season_type]
data.table::setkey(team_games, game_id, team)
data.table::setkey(stats, game_id, team)
model_rows <- team_games[stats, on = .(game_id, team), nomatch = 0]
if (!("player_id" %in% names(model_rows))) stop("Could not join NFL player stats to team-game context.")

rb_weekly <- all_stats[position == "RB", .(
  player_carries = sum(carries, na.rm = TRUE)
), by = .(player_id, game_id, team)]
team_rb_weekly <- rb_weekly[, .(team_carries = sum(player_carries)), by = .(game_id, team)]
rb_weekly[team_rb_weekly, on = .(game_id, team), team_carries := i.team_carries]
rb_weekly[, share := data.table::fifelse(team_carries > 0, player_carries / team_carries, NA_real_)]
data.table::setkey(rb_weekly, player_id, team, game_id)
data.table::setkey(team_rb_weekly, game_id, team)
model_rows[, rb_share := NA_real_]
for (index in seq_len(nrow(model_rows))) {
  if (model_rows$position[index] != "RB") next
  previous_games <- team_games[
    team == model_rows$team[index] & game_date < model_rows$game_date[index],
    tail(game_id, 3)
  ]
  if (length(previous_games) == 0) next
  past <- rb_weekly[J(model_rows$player_id[index], model_rows$team[index], previous_games), nomatch = 0]
  denominator <- team_rb_weekly[J(previous_games, model_rows$team[index]), sum(team_carries, na.rm = TRUE)]
  if (denominator > 0) model_rows$rb_share[index] <- sum(past$player_carries, na.rm = TRUE) / denominator
}

model_rows[, qb_chemistry := NA_real_]
for (index in seq_len(nrow(model_rows))) {
  is_qb <- model_rows$position[index] == "QB"
  qb_id <- if (is_qb) model_rows$player_id[index] else model_rows$expected_qb_id[index]
  model_rows$qb_chemistry[index] <- connection_for(model_rows[index], qb_id, is_qb)
}

output_columns <- c(
  "player_id", "position", "season", "week", "game_type", "game_date",
  "fantasy_points", "targets", "carries", "opponent", "coach", "is_home",
  "expected_qb_id", "qb_chemistry", "rb_share", "prior_go_rate",
  "prior_coach_go_rate", "prior_rush_epa", "prior_rush_success", "prior_sack_rate"
)
model_rows <- model_rows[player_id %in% player_ids, ..output_columns]
model_rows[, `:=`(
  player_id = as.character(player_id),
  season = as.integer(season),
  week = as.integer(week),
  fantasy_points = as.numeric(fantasy_points),
  targets = as.numeric(targets),
  carries = as.numeric(carries)
)]

season <- max(years)
schedules <- tryCatch(nflreadr::load_schedules(seasons = season), error = identity)
if (inherits(schedules, "error")) {
  stop(sprintf("Could not load upcoming NFL schedule context: %s", conditionMessage(schedules)))
}
required_schedule <- c("season", "game_type", "week", "gameday", "home_team", "away_team", "home_coach", "away_coach")
missing_schedule <- setdiff(required_schedule, names(schedules))
if (length(missing_schedule)) stop(sprintf("NFL schedule is missing columns: %s", paste(missing_schedule, collapse = ", ")))
schedule_output <- as.data.table(schedules)[season == max(season), .(
  season = as.integer(season),
  game_type = as.character(game_type),
  week = as.integer(week),
  game_date = as.character(gameday),
  home_team,
  away_team,
  home_coach,
  away_coach
)]

bundle <- list(
  version = "nfl-context-v1",
  source = "nflverse play-by-play, weekly player stats, and schedules",
  attribution = "FTN Data via nflverse is included in applicable seasons; see docs/nfl-data.md.",
  generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE),
  games = data.table::as.data.table(model_rows),
  schedule = schedule_output
)
jsonlite::write_json(bundle, output_path, auto_unbox = TRUE, na = "null", null = "null",
                     dataframe = "rows", pretty = FALSE, digits = 8)
message(sprintf("Wrote %s contextual player-game rows to %s", nrow(model_rows), output_path))
