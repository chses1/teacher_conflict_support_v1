import { writeFileSync } from "node:fs";

const env = process.env;

function value(name, fallback = "") {
  return String(env[name] || fallback).trim();
}

function requireValue(name) {
  const result = value(name);
  if (!result) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return result;
}

const projectId = requireValue("FIREBASE_PROJECT_ID");
const config = {
  apiKey: requireValue("FIREBASE_WEB_API_KEY"),
  authDomain: value("FIREBASE_AUTH_DOMAIN", `${projectId}.firebaseapp.com`),
  projectId,
  storageBucket: value("FIREBASE_STORAGE_BUCKET", `${projectId}.firebasestorage.app`),
  messagingSenderId: requireValue("FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireValue("FIREBASE_APP_ID"),
  measurementId: value("FIREBASE_MEASUREMENT_ID")
};

const output = `export const firebaseConfig = ${JSON.stringify(config, null, 2)};

export const functionRegion = ${JSON.stringify(value("FIREBASE_FUNCTION_REGION", "asia-east1"))};
export const allowedEmailDomain = ${JSON.stringify(value("ALLOWED_EMAIL_DOMAIN", "apps.chses.tyc.edu.tw"))};
export const apiBaseUrl = ${JSON.stringify(value("AI_API_BASE_URL"))};
`;

writeFileSync("firebase-ai-config.js", output);
