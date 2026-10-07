import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const derived = new URL("data/nflverse/derived/", root);
const output = new URL("src/data/player-matchup-analysis.json", root);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index++; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(value); value = ""; }
    else if (char === "\n") { row.push(value.replace(/\r$/, "")); rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (value || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  const [headers, ...records] = rows;
  return records.filter((record) => record.length === headers.length).map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index]])));
}

function sumRows(rows, groupFields, minTargets) {
  const groups = new Map();
  for (const row of rows) {
    const targets = Number(row.targets) || 0;
    if (!row.player_id || targets === 0) continue;
    const key = [row.player_id, ...groupFields.map((field) => row[field] ?? "")].join("|");
    let group = groups.get(key);
    if (!group) {
      group = { playerId: row.player_id, targets: 0, receptions: 0, yards: 0, touchdowns: 0, airYardsWeighted: 0, seasonStart: Infinity, seasonEnd: -Infinity };
      group.context = Object.fromEntries(groupFields.map((field) => [field, row[field] ?? "Unknown"]));
      groups.set(key, group);
    }
    group.targets += targets;
    group.receptions += Number(row.receptions) || 0;
    group.yards += Number(row.receiving_yards) || 0;
    group.touchdowns += Number(row.receiving_tds) || 0;
    group.airYardsWeighted += (Number(row.average_air_yards) || 0) * targets;
    group.seasonStart = Math.min(group.seasonStart, Number(row.season_start) || Infinity);
    group.seasonEnd = Math.max(group.seasonEnd, Number(row.season_end) || -Infinity);
  }
  return [...groups.values()].filter((group) => group.targets >= minTargets).map((group) => ({
    playerId: group.playerId,
    ...group.context,
    targets: group.targets,
    receptions: group.receptions,
    yards: group.yards,
    touchdowns: group.touchdowns,
    catchRate: group.receptions / group.targets,
    yardsPerTarget: group.yards / group.targets,
    averageAirYards: group.airYardsWeighted / group.targets,
    seasonStart: Number.isFinite(group.seasonStart) ? group.seasonStart : null,
    seasonEnd: Number.isFinite(group.seasonEnd) ? group.seasonEnd : null,
  }));
}

const sources = [
  { key: "coverage", filename: "receiver_coverage_splits.csv", fields: ["defense_man_zone_type", "defense_coverage_type"], minTargets: 5 },
  { key: "blitz", filename: "receiver_blitz_splits.csv", fields: ["blitz_bucket"], minTargets: 5 },
  { key: "personnel", filename: "receiver_personnel_splits.csv", fields: ["offense_personnel", "defense_personnel"], minTargets: 10 },
];

const players = {};
let earliestSeason = Infinity;
let latestSeason = -Infinity;
for (const source of sources) {
  let csv;
  try { csv = await readFile(new URL(source.filename, derived), "utf8"); }
  catch { throw new Error(`Missing ${source.filename}; first build the nflverse matchup split CSVs.`); }
  const summaries = sumRows(parseCsv(csv), source.fields, source.minTargets);
  for (const summary of summaries) {
    earliestSeason = Math.min(earliestSeason, summary.seasonStart ?? Infinity);
    latestSeason = Math.max(latestSeason, summary.seasonEnd ?? -Infinity);
    const split = { ...summary };
    delete split.playerId;
    delete split.seasonStart;
    delete split.seasonEnd;
    players[summary.playerId] ??= { coverage: [], blitz: [], personnel: [] };
    players[summary.playerId][source.key].push(split);
  }
}

for (const player of Object.values(players)) {
  player.coverage.sort((a, b) => b.targets - a.targets);
  player.blitz.sort((a, b) => b.targets - a.targets);
  player.personnel.sort((a, b) => b.targets - a.targets);
  player.personnel = player.personnel.slice(0, 6);
}

await writeFile(output, `${JSON.stringify({
  seasons: [earliestSeason, latestSeason],
  attribution: "FTN Data via nflverse; descriptive historical receiving splits",
  players,
}, null, 2)}\n`);
console.log(`Wrote matchup analysis for ${Object.keys(players).length} players to ${output.pathname}`);
