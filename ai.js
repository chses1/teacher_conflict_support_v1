import {
  geminiApiKey,
  geminiEnableGoogleSearch,
  geminiModel
} from "./ai-config.js";

const statusEl = document.getElementById("aiStatus");
const verifyAiButton = document.getElementById("verifyAiButton");

const isPlaceholder = (value) => !value || String(value).includes("REPLACE_WITH_");
const configured = !isPlaceholder(geminiApiKey);
const model = geminiModel || "gemini-2.5-flash";

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text || "";
  statusEl.classList.toggle("is-visible", Boolean(text));
  statusEl.classList.toggle("hidden", !text);
}

async function callGemini(prompt, options = {}) {
  if (!configured) throw new Error("尚未設定 Gemini API key。");
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.4,
      maxOutputTokens: options.maxOutputTokens ?? 1200
    }
  };
  if (options.googleSearch && geminiEnableGoogleSearch) {
    body.tools = [{ google_search: {} }];
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "AI 服務暫時無法使用。");
    error.status = response.status;
    error.code = data?.error?.code || response.status;
    throw error;
  }
  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("AI 沒有回傳文字，請稍後再試。");
  const metadata = data?.candidates?.[0]?.groundingMetadata || data?.candidates?.[0]?.grounding_metadata;
  const chunks = metadata?.groundingChunks || metadata?.grounding_chunks || [];
  const sources = chunks
    .map((chunk) => chunk.web || chunk.retrievedContext || chunk.retrieved_context || null)
    .filter(Boolean)
    .map((source) => ({
      title: source.title || source.uri || "資料來源",
      uri: source.uri || ""
    }))
    .filter((source) => source.uri);
  return { text, sources };
}

async function generateText(prompt, options = {}) {
  return callGemini(prompt, options);
}

async function verifyApiKey() {
  if (!configured) return;
  setStatus("頁內 AI：正在驗證 API key");
  if (verifyAiButton) verifyAiButton.disabled = true;
  try {
    await callGemini("請只回覆：OK", { temperature: 0, maxOutputTokens: 8 });
    setStatus("頁內 AI：API 可用");
  } catch (error) {
    setStatus(`頁內 AI：API 驗證失敗（${error?.message || "請檢查設定"}）`);
  } finally {
    if (verifyAiButton) verifyAiButton.disabled = false;
  }
}

window.teacherAi = {
  canGenerate: () => configured,
  generateText,
  isConfigured: () => configured,
  isAllowed: () => true,
  isSignedIn: () => true
};

if (configured) {
  setStatus("頁內 AI 可用；若服務暫時無法使用，仍會改用 Google AI Mode。");
  verifyAiButton?.classList.remove("hidden");
  verifyAiButton?.addEventListener("click", verifyApiKey);
} else {
  setStatus("");
  verifyAiButton?.classList.add("hidden");
}
