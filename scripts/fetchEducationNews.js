import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(rootDir, "data/education-news.json");
const maxItems = 8;
const queries = [
  "台灣 教育 校園",
  "台灣 教師 學生",
  "教育部 校園",
  "校園 霸凌 教師"
];

function decodeHtmlEntities(text = "") {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function textBetween(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeHtmlEntities((match?.[1] || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
}

function sourceFrom(itemXml) {
  const match = itemXml.match(/<source(?:\s+url="([^"]*)")?[^>]*>([\s\S]*?)<\/source>/i);
  return {
    sourceUrl: decodeHtmlEntities(match?.[1] || ""),
    sourceName: decodeHtmlEntities((match?.[2] || "Google News").trim())
  };
}

function parsePubDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function parseItems(feedXml) {
  return [...feedXml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const itemXml = match[1];
    const source = sourceFrom(itemXml);
    return {
      title: textBetween(itemXml, "title"),
      url: textBetween(itemXml, "link"),
      publishedAt: parsePubDate(textBetween(itemXml, "pubDate")),
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl
    };
  });
}

function feedUrl(query) {
  const params = new URLSearchParams({
    q: query,
    hl: "zh-TW",
    gl: "TW",
    ceid: "TW:zh-Hant"
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

async function fetchFeed(query) {
  const response = await fetch(feedUrl(query), {
    headers: {
      "User-Agent": "teacher-conflict-support-news/1.0"
    }
  });
  if (!response.ok) throw new Error(`Google News RSS failed: ${response.status}`);
  return parseItems(await response.text());
}

const fetchedAt = new Date().toISOString();
const allItems = [];
const errors = [];

for (const query of queries) {
  try {
    allItems.push(...await fetchFeed(query));
  } catch (error) {
    errors.push({ query, message: error?.message || "Unable to fetch feed." });
  }
}

const seen = new Set();
const items = allItems
  .filter((item) => item.title && item.url)
  .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
  .filter((item) => {
    const key = item.url || item.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .slice(0, maxItems);

const output = {
  updatedAt: fetchedAt.slice(0, 10),
  sourceLabel: "Google News 台灣教育",
  note: "News items are fetched from Google News RSS search results and should be verified on the linked source page.",
  items,
  errors
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Wrote ${outputPath} with ${items.length} news items.`);
