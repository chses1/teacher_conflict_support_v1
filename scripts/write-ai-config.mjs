import { writeFileSync } from "node:fs";

function value(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function booleanValue(name, fallback = true) {
  const raw = value(name, String(fallback));
  return !["0", "false", "no", "off"].includes(raw.toLowerCase());
}

const output = `export const geminiApiKey = ${JSON.stringify(value("GEMINI_API_KEY", "REPLACE_WITH_GEMINI_API_KEY"))};
export const geminiModel = ${JSON.stringify(value("GEMINI_MODEL", "gemini-2.5-flash"))};
export const geminiEnableGoogleSearch = ${JSON.stringify(booleanValue("GEMINI_ENABLE_GOOGLE_SEARCH", true))};
`;

writeFileSync("ai-config.js", output);
