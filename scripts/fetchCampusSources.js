import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcesPath = resolve(rootDir, "sources.json");
const draftPath = resolve(rootDir, "data/drafts/campus-events-draft.json");
const maxRawTextLength = 20000;

function decodeHtmlEntities(text) {
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

function htmlToText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function contextFor(text, index, length) {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + length + 30);
  return text.slice(start, end).trim();
}

function extractNumbers(text) {
  const matches = [];
  const seen = new Set();
  const numberPattern = /-?\d+(?:[.,]\d+)?%?/g;
  for (const match of text.matchAll(numberPattern)) {
    const value = match[0];
    const context = contextFor(text, match.index || 0, value.length);
    const key = `${value}::${context}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({
      value,
      context,
      status: "needs_review"
    });
  }
  return matches;
}

async function loadSources() {
  const raw = await readFile(sourcesPath, "utf8");
  const sources = JSON.parse(raw);
  if (!Array.isArray(sources)) {
    throw new Error("sources.json must be an array.");
  }
  return sources.map((source, index) => {
    if (!source?.id || !source?.name || !source?.url) {
      throw new Error(`sources.json item ${index + 1} must include id, name, and url.`);
    }
    return source;
  });
}

async function fetchSource(source) {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "teacher-conflict-support-data-review/1.0"
      }
    });
    const contentType = response.headers.get("content-type") || "";
    const body = await response.text();
    const rawText = htmlToText(body).slice(0, maxRawTextLength);
    return {
      ...source,
      fetchedAt,
      ok: response.ok,
      statusCode: response.status,
      contentType,
      rawText,
      summary: rawText.slice(0, 800),
      numbers: extractNumbers(rawText)
    };
  } catch (error) {
    return {
      ...source,
      fetchedAt,
      ok: false,
      error: error?.message || "Unable to fetch source.",
      rawText: "",
      summary: "",
      numbers: []
    };
  }
}

const sources = await loadSources();
const results = [];
for (const source of sources) {
  results.push(await fetchSource(source));
}

const draft = {
  generatedAt: new Date().toISOString(),
  note: "Draft only. Review manually before copying any content into data/campus-events.json.",
  sources: results
};

await mkdir(dirname(draftPath), { recursive: true });
await writeFile(draftPath, `${JSON.stringify(draft, null, 2)}\n`);

console.log(`Wrote ${draftPath}`);
