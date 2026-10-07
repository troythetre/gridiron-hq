#!/usr/bin/env Rscript

# Download source datasets used for fantasy projections and matchup analysis.
# Data is stored locally and intentionally kept out of git; see docs/nfl-data.md.

args <- commandArgs(trailingOnly = TRUE)
seasons_arg <- if (length(args) > 0) args[[1]] else "2016:2026"

parse_seasons <- function(value) {
  if (grepl("^[0-9]{4}:[0-9]{4}$", value)) {
    bounds <- as.integer(strsplit(value, ":", fixed = TRUE)[[1]])
    return(seq(bounds[[1]], bounds[[2]]))
  }

  seasons <- suppressWarnings(as.integer(strsplit(value, ",", fixed = TRUE)[[1]]))
  if (length(seasons) == 0 || anyNA(seasons) || any(seasons < 1999)) {
    stop("Pass seasons as a range (2016:2025) or comma-separated years (2023,2024).")
  }
  unique(seasons)
}

seasons <- parse_seasons(seasons_arg)
if (any(seasons < 2016)) {
  stop("This pipeline starts in 2016, when the participation and Next Gen Stats data begin.")
}

script_arg <- grep("^--file=", commandArgs(), value = TRUE)
if (length(script_arg) == 0) stop("Run this file with Rscript so its location can be resolved.")
script_path <- sub("^--file=", "", script_arg[[1]])
repo_root <- normalizePath(file.path(dirname(script_path), ".."), mustWork = TRUE)
local_r_lib <- file.path(repo_root, ".Rlib")
if (dir.exists(local_r_lib)) .libPaths(c(local_r_lib, .libPaths()))

if (!requireNamespace("nflreadr", quietly = TRUE)) {
  stop("Install nflreadr first with install.packages('nflreadr', lib = '.Rlib').")
}

output_dir <- file.path(repo_root, "data", "nflverse", "raw")
dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)
manifest_path <- file.path(repo_root, "data", "nflverse", "manifest.csv")

loaders <- list(
  pbp = function(season) nflreadr::load_pbp(seasons = season),
  player_stats_week = function(season) {
    nflreadr::load_player_stats(seasons = season, summary_level = "week")
  },
  participation = function(season) {
    nflreadr::load_participation(seasons = season, include_pbp = FALSE)
  },
  nextgen_receiving = function(season) {
    nflreadr::load_nextgen_stats(seasons = season, stat_type = "receiving")
  },
  ftn_charting = function(season) nflreadr::load_ftn_charting(seasons = season)
)

manifest <- if (file.exists(manifest_path)) {
  read.csv(manifest_path, stringsAsFactors = FALSE)
} else {
  data.frame(
    dataset = character(), season = integer(), rows = integer(),
    status = character(), fetched_at_utc = character(), stringsAsFactors = FALSE
  )
}

for (season in seasons) {
  for (dataset in names(loaders)) {
    if (dataset == "ftn_charting" && season < 2022) next

    message(sprintf("Fetching %s for %s...", dataset, season))
    fetched_at <- format(Sys.time(), tz = "UTC", usetz = TRUE)
    result <- tryCatch(loaders[[dataset]](season), error = identity)

    manifest <- manifest[!(manifest$dataset == dataset & manifest$season == season), , drop = FALSE]

    if (inherits(result, "error") || is.null(nrow(result)) || nrow(result) == 0) {
      reason <- if (inherits(result, "error")) conditionMessage(result) else "upstream returned no rows"
      message(sprintf("  Skipped: %s", reason))
      manifest <- rbind(manifest, data.frame(
        dataset = dataset, season = season, rows = NA_integer_, status = "unavailable",
        fetched_at_utc = fetched_at, stringsAsFactors = FALSE
      ))
      next
    }

    output_path <- file.path(output_dir, sprintf("%s_%s.rds", dataset, season))
    saveRDS(result, output_path, compress = "gzip")
    manifest <- rbind(manifest, data.frame(
      dataset = dataset, season = season, rows = nrow(result), status = "downloaded",
      fetched_at_utc = fetched_at, stringsAsFactors = FALSE
    ))
    message(sprintf("  Saved %s rows to %s", format(nrow(result), big.mark = ","), output_path))
  }
}

write.csv(manifest, manifest_path, row.names = FALSE)
message(sprintf("Manifest updated: %s", manifest_path))
