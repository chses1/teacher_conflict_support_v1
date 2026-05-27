import express from "express";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const rootDir = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const maxPromptLength = Number(process.env.MAX_PROMPT_LENGTH || 12000);
const allowedEmailDomain = String(process.env.ALLOWED_EMAIL_DOMAIN || "apps.chses.tyc.edu.tw").toLowerCase();
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const corsAllowedOrigin = process.env.CORS_ALLOWED_ORIGIN || "*";

app.use(express.json({ limit: "128kb" }));
app.use("/api", (request, response, next) => {
  response.setHeader("Access-Control-Allow-Origin", corsAllowedOrigin);
  response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (request.method === "OPTIONS") {
    response.sendStatus(204);
    return;
  }
  next();
});

function firebaseCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return admin.credential.cert(JSON.parse(serviceAccountJson));
  }
  return admin.credential.applicationDefault();
}

admin.initializeApp({
  credential: firebaseCredential()
});

function cleanPrompt(prompt) {
  const value = String(prompt || "").trim();
  if (!value) {
    const error = new Error("缺少 AI 提示詞。");
    error.status = 400;
    throw error;
  }
  if (value.length > maxPromptLength) {
    const error = new Error("事件內容太長，請先精簡後再送出。");
    error.status = 400;
    throw error;
  }
  return value;
}

function aiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("Gemini API key 尚未設定。");
    error.status = 503;
    throw error;
  }
  return new GoogleGenAI({ apiKey });
}

async function requireAllowedUser(request) {
  const authorization = String(request.headers.authorization || "");
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    const error = new Error("請先使用 Google 帳號登入。");
    error.status = 401;
    throw error;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  const email = String(decoded.email || "").toLowerCase();
  if (!email || !email.endsWith(`@${allowedEmailDomain}`)) {
    const error = new Error(`此工具限 ${allowedEmailDomain} 帳號登入使用。`);
    error.status = 403;
    throw error;
  }
  return { uid: decoded.uid, email };
}

function sendError(response, error) {
  const status = Number(error.status || 500);
  const message = status >= 500 ? "AI 服務暫時無法使用，請稍後再試。" : error.message;
  if (status >= 500) {
    console.error(error);
  }
  response.status(status).json({ error: message });
}

app.post("/api/generate", async (request, response) => {
  try {
    await requireAllowedUser(request);
    const prompt = cleanPrompt(request.body?.prompt);
    const result = await aiClient().models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 1200
      }
    });
    const text = String(result.text || "").trim();
    if (!text) {
      const error = new Error("Gemini 沒有回傳文字。");
      error.status = 502;
      throw error;
    }
    response.json({ text });
  } catch (error) {
    sendError(response, error);
  }
});

app.post("/api/verify", async (request, response) => {
  try {
    await requireAllowedUser(request);
    const result = await aiClient().models.generateContent({
      model: geminiModel,
      contents: "請只回覆：OK",
      config: {
        temperature: 0,
        maxOutputTokens: 8
      }
    });
    response.json({ ok: Boolean(String(result.text || "").trim()) });
  } catch (error) {
    sendError(response, error);
  }
});

const publicFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/firebase-ai.js", "firebase-ai.js"],
  ["/firebase-ai-config.js", "firebase-ai-config.js"],
  ["/data/campus-events.json", "data/campus-events.json"],
  ["/%E4%B8%AD%E5%B1%B1%E5%9C%8B%E5%B0%8F.jpg", "中山國小.jpg"],
  ["/中山國小.jpg", "中山國小.jpg"]
]);

app.get("*", (request, response, next) => {
  const file = publicFiles.get(request.path);
  if (!file) return next();
  return response.sendFile(join(rootDir, file));
});

app.listen(port, () => {
  console.log(`Teacher support app listening on ${port}`);
});
