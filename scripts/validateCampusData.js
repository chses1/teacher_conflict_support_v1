import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const officialPath = resolve(rootDir, "data/campus-events.json");
const draftPath = resolve(rootDir, "data/drafts/campus-events-draft.json");

function findNeedsReview(value, path = "$") {
  const hits = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => hits.push(...findNeedsReview(item, `${path}[${index}]`)));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const nextPath = `${path}.${key}`;
      if (key === "status" && item === "needs_review") {
        hits.push(nextPath);
      }
      hits.push(...findNeedsReview(item, nextPath));
    }
  }
  return hits;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const errors = [];
const official = await readJson(officialPath);

if (!official || typeof official !== "object" || Array.isArray(official)) {
  errors.push("data/campus-events.json must be a JSON object.");
}

if (typeof official.yearLabel !== "string" || !official.yearLabel.trim()) {
  errors.push("data/campus-events.json must include yearLabel.");
}

if (typeof official.lastUpdated !== "string" || !official.lastUpdated.trim()) {
  errors.push("data/campus-events.json must include lastUpdated.");
}

if (!Array.isArray(official.items)) {
  errors.push("data/campus-events.json must include items as an array.");
} else {
  official.items.forEach((item, index) => {
    for (const field of ["title", "unit", "summary", "sourceName", "sourceUrl"]) {
      if (typeof item?.[field] !== "string" || !item[field].trim()) {
        errors.push(`items[${index}].${field} must be a non-empty string.`);
      }
    }
    if (!(typeof item?.value === "number" || item?.value === null)) {
      errors.push(`items[${index}].value must be a number or null.`);
    }
  });
}

if (!Array.isArray(official.notes)) {
  errors.push("data/campus-events.json must include notes as an array.");
} else {
  official.notes.forEach((note, index) => {
    if (typeof note !== "string" || !note.trim()) {
      errors.push(`notes[${index}] must be a non-empty string.`);
    }
  });
}

const officialNeedsReview = findNeedsReview(official);
if (officialNeedsReview.length) {
  errors.push(`data/campus-events.json must not contain status: "needs_review" (${officialNeedsReview.join(", ")}).`);
}

if (await fileExists(draftPath)) {
  const draft = await readJson(draftPath);
  const sources = Array.isArray(draft?.sources) ? draft.sources : [];
  for (const [sourceIndex, source] of sources.entries()) {
    const numbers = Array.isArray(source?.numbers) ? source.numbers : [];
    for (const [numberIndex, number] of numbers.entries()) {
      if (number?.status !== "needs_review") {
        errors.push(`Draft number status must be needs_review at sources[${sourceIndex}].numbers[${numberIndex}].`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Campus data validation passed.");
