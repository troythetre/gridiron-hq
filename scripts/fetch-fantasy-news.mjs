import { readFile } from "node:fs/promises";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the news fetcher.");
}

const feeds = [
  { name: "ESPN", feed: "https://www.espn.com/espn/rss/nfl/news", homepage: "https://www.espn.com/nfl/" },
  { name: "FantasyPros", feed: "https://www.fantasypros.com/feed/", homepage: "https://www.fantasypros.com/" },
  { name: "CBS Sports", feed: "https://www.cbssports.com/xml/rss", homepage: "https://www.cbssports.com/nfl/" },
];

const teamTerms = [
  "Arizona Cardinals", "Atlanta Falcons", "Baltimore Ravens", "Buffalo Bills", "Carolina Panthers", "Chicago Bears",
  "Cincinnati Bengals", "Cleveland Browns", "Dallas Cowboys", "Denver Broncos", "Detroit Lions", "Green Bay Packers",
  "Houston Texans", "Indianapolis Colts", "Jacksonville Jaguars", "Kansas City Chiefs", "Las Vegas Raiders",
  "Los Angeles Chargers", "Los Angeles Rams", "Miami Dolphins", "Minnesota Vikings", "New England Patriots",
  "New Orleans Saints", "New York Giants", "New York Jets", "Philadelphia Eagles", "Pittsburgh Steelers",
  "San Francisco 49ers", "Seattle Seahawks", "Tampa Bay Buccaneers", "Tennessee Titans", "Washington Commanders",
  "Cardinals", "Falcons", "Ravens", "Bills", "Panthers", "Bears", "Bengals", "Browns", "Cowboys", "Broncos",
  "Lions", "Packers", "Texans", "Colts", "Jaguars", "Chiefs", "Raiders", "Chargers", "Rams", "Dolphins",
  "Vikings", "Patriots", "Saints", "Giants", "Jets", "Eagles", "Steelers", "49ers", "Seahawks", "Buccaneers",
  "Titans", "Commanders",
];
const abbreviations = "ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LV LAC LAR MIA MIN NE NO NYG NYJ PHI PIT SF SEA TB TEN WAS".split(" ");
const fantasyTerms = [
  "fantasy football", "fantasy impact", "fantasy outlook", "fantasy points", "fantasy manager", "fantasy managers",
  "PPR", "half PPR", "half-PPR", "points per reception", "dynasty", "waiver wire", "start sit", "start/sit",
  "redraft", "keeper league", "trade value", "rest of season", "ROS", "ADP", "target share", "snap share",
];

const playerData = JSON.parse(await readFile(new URL("../src/data/player-profiles.json", import.meta.url), "utf8"));
const playerNames = [...new Set(playerData.map((player) => player.name).filter((name) => name && name.length > 5))];

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesPhrase(text, phrase) {
  return ` ${text} `.includes(` ${normalize(phrase)} `);
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'");
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].trim()) : "";
}

function parseItems(xml) {
  const blocks = [...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => match[2]);
  return blocks.map((block) => {
    const atomLink = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)?.[1];
    const link = atomLink || tagValue(block, "link") || tagValue(block, "guid");
    const imageUrl = block.match(/<(?:media:thumbnail|media:content|enclosure)\b[^>]*(?:url|href)=["']([^"']+)["'][^>]*>/i)?.[1]
      || block.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1] || "";
    return {
      headline: tagValue(block, "title").replace(/<[^>]+>/g, "").trim(),
      articleUrl: decodeXml(link.trim()),
      excerpt: tagValue(block, "description") || tagValue(block, "summary") || tagValue(block, "content:encoded"),
      date: tagValue(block, "pubDate") || tagValue(block, "published") || tagValue(block, "updated"),
      imageUrl: decodeXml(imageUrl),
    };
  }).filter((item) => item.headline && /^https?:\/\//i.test(item.articleUrl));
}

function topicsFor(item) {
  const text = normalize(`${item.headline} ${item.excerpt}`);
  const topics = new Set();
  if (fantasyTerms.some((term) => matchesPhrase(text, term))) topics.add("fantasy");
  if (matchesPhrase(text, "PPR") || matchesPhrase(text, "points per reception")) topics.add("ppr");
  if (matchesPhrase(text, "half PPR") || matchesPhrase(text, "half-PPR")) topics.add("half_ppr");
  if (matchesPhrase(text, "dynasty") || matchesPhrase(text, "keeper league")) topics.add("dynasty");
  if (/practice|practiced|participant|workout|walkthrough|first team reps/.test(text)) topics.add("practice");
  if (/injur|questionable|doubtful|ruled out|inactive|ir\b|concussion|surgery/.test(text)) topics.add("injury");
  if (teamTerms.some((term) => matchesPhrase(text, term)) || abbreviations.some((term) => matchesPhrase(text, term))) topics.add("teams");
  if (playerNames.some((name) => matchesPhrase(text, name))) topics.add("players");
  return [...topics];
}

function cleanExcerpt(value) {
  return decodeXml(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
}

const results = await Promise.allSettled(feeds.map(async (feed) => {
  const response = await fetch(feed.feed, { headers: { "user-agent": "GridironHQ-NewsBot/1.0 (+https://github.com/troythetre/gridiron-hq)" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${feed.name} feed returned HTTP ${response.status}`);
  const xml = await response.text();
  const items = parseItems(xml).slice(0, 100).map((item) => ({ ...item, topics: topicsFor(item) }))
    .map((item) => ({
      headline: item.headline.slice(0, 300),
      body: cleanExcerpt(item.excerpt),
      item_date: Number.isNaN(Date.parse(item.date)) ? new Date().toISOString().slice(0, 10) : new Date(item.date).toISOString().slice(0, 10),
      source: feed.name,
      article_url: item.articleUrl,
      source_url: feed.homepage,
      image_url: /^https?:\/\//i.test(item.imageUrl) ? item.imageUrl : null,
      topics: item.topics,
    }));
  return { source: feed.name, items };
}));

const payload = results.flatMap((result) => result.status === "fulfilled" ? result.value.items : []);
for (const result of results) {
  if (result.status === "rejected") console.error(`Feed failed: ${result.reason.message}`);
  else console.log(`${result.value.source}: ${result.value.items.length} matching items`);
}
if (results.every((result) => result.status === "rejected")) {
  throw new Error("All configured news feeds failed; see the feed errors above.");
}

if (payload.length === 0) {
  console.log("No matching news items to upsert.");
  process.exit(0);
}

const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/news_items?on_conflict=article_url`;
const response = await fetch(url, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
    prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(payload),
});
if (!response.ok) throw new Error(`Supabase news upsert failed: HTTP ${response.status} ${await response.text()}`);
console.log(`Upserted ${payload.length} sourced news items.`);
