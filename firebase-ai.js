import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  getIdToken,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  allowedEmailDomain,
  apiBaseUrl,
  firebaseConfig
} from "./firebase-ai-config.js";

const statusEl = document.getElementById("aiStatus");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const verifyAiButton = document.getElementById("verifyAiButton");

const isPlaceholder = (value) => !value || String(value).includes("REPLACE_WITH_");
const requiredFirebaseConfigKeys = ["apiKey", "authDomain", "projectId", "appId"];
const configured = requiredFirebaseConfigKeys.every((key) => !isPlaceholder(firebaseConfig[key]));

let currentUser = null;
let currentUserAllowed = false;

function apiUrl(path) {
  const base = String(apiBaseUrl || "").replace(/\/$/, "");
  return `${base}${path}`;
}

async function callAiApi(path, body = {}) {
  const token = await getIdToken(currentUser);
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "AI 服務暫時無法使用。");
  }
  return data;
}

function setStatus(text) {
  if (!statusEl) return;
  statusEl.textContent = text || "";
  statusEl.classList.toggle("is-visible", Boolean(text));
  statusEl.classList.toggle("hidden", !text);
}

function show(el, visible) {
  el?.classList.toggle("hidden", !visible);
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  if (code.includes("unauthorized-domain")) {
    return "目前網址尚未加入 Firebase 授權網域。請到 Firebase Authentication > Settings > Authorized domains 加入此測試網址或正式網域。";
  }
  if (code.includes("popup-blocked")) {
    return "登入視窗被瀏覽器阻擋，請允許彈出視窗後再試。";
  }
  if (code.includes("popup-closed-by-user")) {
    return "登入視窗已關閉，尚未完成登入。";
  }
  if (code.includes("operation-not-supported-in-this-environment")) {
    return "目前瀏覽環境不支援此登入方式，請改用一般視窗或允許第三方 Cookie。";
  }
  return error?.message || "請確認 Firebase Google 登入與授權網域設定。";
}

function userName(user) {
  return user?.displayName || user?.email || "已登入";
}

async function generateText(prompt) {
  if (!configured) throw new Error("Firebase 尚未設定，請先設定 firebase-ai-config.js 或 GitHub 環境變數。");
  if (!currentUser) throw new Error("請先使用 Google 帳號登入。");
  if (!currentUserAllowed) throw new Error(`此工具限 ${allowedEmailDomain} 帳號登入使用。`);
  const result = await callAiApi("/api/generate", { prompt });
  const text = result?.text;
  if (!text) throw new Error("AI 沒有回傳文字，請稍後再試。");
  return { text, quota: result?.quota };
}

async function verifyApiKey() {
  if (!configured || !currentUser) return;
  setStatus("AI 模式：正在驗證 API key");
  verifyAiButton.disabled = true;
  try {
    const result = await callAiApi("/api/verify");
    setStatus(result?.ok ? `AI 模式：API 可用（${userName(currentUser)}）` : "AI 模式：API 驗證失敗");
  } catch (error) {
    setStatus(`AI 模式：API 驗證失敗（${error?.message || "請檢查設定"}）`);
  } finally {
    verifyAiButton.disabled = false;
  }
}

async function signInWithSchoolAccount(auth, provider) {
  const ok = window.confirm(
    `請使用 @${allowedEmailDomain} 的 Google 帳號登入。\n\n若使用其他帳號，頁內 AI 功能將無法使用，仍可使用單機版與 Google AI Mode 備用流程。`
  );
  if (!ok) return;

  try {
    provider.setCustomParameters({
      hd: allowedEmailDomain,
      prompt: "select_account"
    });
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = error?.code || "";
    if (code.includes("popup-blocked") || code.includes("cancelled-popup-request")) {
      try {
        await signInWithRedirect(auth, provider);
        return;
      } catch (redirectError) {
        setStatus(`登入失敗：${friendlyAuthError(redirectError)}`);
        return;
      }
    }
    setStatus(`登入失敗：${friendlyAuthError(error)}`);
  }
}

window.teacherAi = {
  canGenerate: () => configured && !!currentUser && currentUserAllowed,
  generateText,
  isConfigured: () => configured,
  isAllowed: () => currentUserAllowed,
  isSignedIn: () => !!currentUser
};

if (!configured) {
  setStatus("");
  show(signInButton, false);
  show(signOutButton, false);
  show(verifyAiButton, false);
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  show(signInButton, true);
  show(verifyAiButton, false);
  show(signOutButton, false);
  setStatus("");

  signInButton?.addEventListener("click", () => signInWithSchoolAccount(auth, provider));
  signOutButton?.addEventListener("click", () => signOut(auth));
  verifyAiButton?.addEventListener("click", verifyApiKey);
  getRedirectResult(auth)
    .then((result) => {
      if (result?.user) setStatus(`已登入：${userName(result.user)}`);
    })
    .catch((error) => {
      setStatus(`登入失敗：${friendlyAuthError(error)}`);
    });

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const email = String(user?.email || "").toLowerCase();
    currentUserAllowed = !!user && email.endsWith(`@${allowedEmailDomain}`);
    show(signInButton, !user);
    show(signOutButton, !!user);
    show(verifyAiButton, !!user && currentUserAllowed);
    if (!user) {
      setStatus("");
    } else if (!currentUserAllowed) {
      setStatus(`此帳號不可用，限 @${allowedEmailDomain}`);
    } else {
      setStatus(`已登入：${userName(user)}`);
    }
  });
}
