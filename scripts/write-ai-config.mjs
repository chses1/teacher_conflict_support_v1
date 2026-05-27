import { writeFileSync } from "node:fs";

function value(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

const output = `export const geminiApiKey = ${JSON.stringify(value("GEMINI_API_KEY", "REPLACE_WITH_GEMINI_API_KEY"))};
export const geminiModel = ${JSON.stringify(value("GEMINI_MODEL", "gemini-2.0-flash"))};
`;

writeFileSync("ai-config.js", output);
