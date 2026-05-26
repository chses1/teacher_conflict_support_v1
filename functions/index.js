const { GoogleGenAI } = require("@google/genai");
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineInt, defineSecret, defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

admin.initializeApp();

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const geminiModel = defineString("GEMINI_MODEL", { default: "gemini-2.0-flash" });
const allowedEmailDomain = defineString("ALLOWED_EMAIL_DOMAIN", { default: "apps.chses.tyc.edu.tw" });
const dailyAiLimit = defineInt("DAILY_AI_LIMIT", { default: 5 });
const monthlySchoolAiLimit = defineInt("MONTHLY_SCHOOL_AI_LIMIT", { default: 100 });

const region = "asia-east1";
const maxPromptLength = 12000;
const timeZone = "Asia/Taipei";

function requireSignedIn(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "請先使用 Google 帳號登入。");
  }
}

function requireAllowedDomain(request) {
  requireSignedIn(request);
  const email = String(request.auth.token.email || "").toLowerCase();
  const domain = String(allowedEmailDomain.value() || "").toLowerCase();
  if (!email || !domain || !email.endsWith(`@${domain}`)) {
    throw new HttpsError("permission-denied", `此工具限 ${domain} 帳號登入使用。`);
  }
  return email;
}

function taipeiDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function taipeiMonthKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}`;
}

async function consumeDailyQuota(request, email) {
  const limit = dailyAiLimit.value();
  const dateKey = taipeiDateKey();
  const docId = `${dateKey}_${request.auth.uid}`;
  const ref = admin.firestore().collection("aiUsage").doc(docId);

  return admin.firestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = snap.exists ? Number(snap.data().count || 0) : 0;
    if (current >= limit) {
      throw new HttpsError(
        "resource-exhausted",
        `今日頁內 AI 額度已用完（${current}/${limit}）。請改用免費 Google AI Mode 備用流程。`
      );
    }
    const next = current + 1;
    transaction.set(
      ref,
      {
        uid: request.auth.uid,
        email,
        dateKey,
        count: next,
        limit,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    return { remaining: limit - next, used: next, limit, docId };
  });
}

async function refundDailyQuota(quota) {
  if (!quota?.docId) return;
  const ref = admin.firestore().collection("aiUsage").doc(quota.docId);
  await admin.firestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return;
    const current = Number(snap.data().count || 0);
    transaction.set(
      ref,
      {
        count: Math.max(0, current - 1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

async function consumeMonthlySchoolQuota() {
  const limit = monthlySchoolAiLimit.value();
  const monthKey = taipeiMonthKey();
  const docId = `school_${monthKey}`;
  const ref = admin.firestore().collection("aiMonthlyUsage").doc(docId);

  return admin.firestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = snap.exists ? Number(snap.data().count || 0) : 0;
    if (current >= limit) {
      throw new HttpsError(
        "resource-exhausted",
        `本月全校頁內 AI 額度已用完（${current}/${limit}）。請改用免費 Google AI Mode 備用流程。`
      );
    }
    const next = current + 1;
    transaction.set(
      ref,
      {
        monthKey,
        count: next,
        limit,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    return { remaining: limit - next, used: next, limit, docId };
  });
}

async function refundMonthlySchoolQuota(quota) {
  if (!quota?.docId) return;
  const ref = admin.firestore().collection("aiMonthlyUsage").doc(quota.docId);
  await admin.firestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return;
    const current = Number(snap.data().count || 0);
    transaction.set(
      ref,
      {
        count: Math.max(0, current - 1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  });
}

function cleanPrompt(prompt) {
  const value = String(prompt || "").trim();
  if (!value) {
    throw new HttpsError("invalid-argument", "缺少 AI 提示詞。");
  }
  if (value.length > maxPromptLength) {
    throw new HttpsError("invalid-argument", "事件內容太長，請先精簡後再送出。");
  }
  return value;
}

function client() {
  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Gemini API key 尚未設定。");
  }
  return new GoogleGenAI({ apiKey });
}

exports.generateAiText = onCall(
  {
    region,
    secrets: [geminiApiKey],
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (request) => {
    const email = requireAllowedDomain(request);
    const prompt = cleanPrompt(request.data?.prompt);
    let quota = null;
    let monthlyQuota = null;

    try {
      const aiClient = client();
      quota = await consumeDailyQuota(request, email);
      monthlyQuota = await consumeMonthlySchoolQuota();
      const response = await aiClient.models.generateContent({
        model: geminiModel.value(),
        contents: prompt,
        config: {
          temperature: 0.4,
          maxOutputTokens: 1200
        }
      });
      const text = String(response.text || "").trim();
      if (!text) {
        throw new HttpsError("internal", "Gemini 沒有回傳文字。");
      }
      return {
        text,
        quota: {
          remaining: quota.remaining,
          used: quota.used,
          limit: quota.limit,
          monthlyRemaining: monthlyQuota.remaining,
          monthlyUsed: monthlyQuota.used,
          monthlyLimit: monthlyQuota.limit
        }
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        await refundDailyQuota(quota);
        await refundMonthlySchoolQuota(monthlyQuota);
        throw error;
      }
      await refundDailyQuota(quota);
      await refundMonthlySchoolQuota(monthlyQuota);
      logger.error("Gemini generation failed", {
        uid: request.auth.uid,
        message: error?.message
      });
      throw new HttpsError("internal", "AI 服務暫時無法使用，請稍後再試。");
    }
  }
);

exports.verifyGeminiApiKey = onCall(
  {
    region,
    secrets: [geminiApiKey],
    timeoutSeconds: 30,
    memory: "256MiB"
  },
  async (request) => {
    requireAllowedDomain(request);

    try {
      const response = await client().models.generateContent({
        model: geminiModel.value(),
        contents: "請只回覆：OK",
        config: {
          temperature: 0,
          maxOutputTokens: 8
        }
      });
      return { ok: Boolean(String(response.text || "").trim()) };
    } catch (error) {
      logger.error("Gemini API key verification failed", {
        uid: request.auth.uid,
        message: error?.message
      });
      throw new HttpsError("failed-precondition", "Gemini API key 驗證失敗，請檢查 Secret 設定。");
    }
  }
);
