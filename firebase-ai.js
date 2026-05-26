import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyADPOBd0OgGGwxuiiJtPzFT8pyCVv7n47s",
  authDomain: "teacher-conflict-support.firebaseapp.com",
  projectId: "teacher-conflict-support",
  storageBucket: "teacher-conflict-support.firebasestorage.app",
  messagingSenderId: "1047946809859",
  appId: "1:1047946809859:web:801ed2ee35a0bdaea4f436",
  measurementId: "G-J4BT7NF76C"
};

const functionRegion = "asia-east1";
const allowedEmailDomain = "apps.chses.tyc.edu.tw";
const statusEl = document.getElementById("aiStatus");
const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const verifyAiButton = document.getElementById("verifyAiButton");

const isPlaceholder = (value) => !value || String(value).includes("REPLACE_WITH_");
const configured = Object.values(firebaseConfig).every((value) => !isPlaceholder(value));

let currentUser = null;
let currentUserAllowed = false;
let generateTextCallable = null;
let verifyApiKeyCallable = null;

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
    return "登入視窗被瀏覽器阻擋，系統將改用整頁登入。";
  }
  if (code.includes("popup-closed-by-user")) {
    return "登入視窗已關閉，尚未完成登入。";
  }
  return error?.message || "請確認 Firebase Google 登入與授權網域設定。";
}

function userName(user) {
  return user?.displayName || user?.email || "已登入";
}

async function generateText(prompt) {
  if (!configured) throw new Error("Firebase 尚未設定，請先填入 firebase-ai.js 的專案設定。");
  if (!currentUser) throw new Error("請先使用 Google 帳號登入。");
  if (!currentUserAllowed) throw new Error(`此工具限 ${allowedEmailDomain} 帳號登入使用。`);
  const result = await generateTextCallable({ prompt });
  const text = result?.data?.text;
  if (!text) throw new Error("AI 沒有回傳文字，請稍後再試。");
  return { text, quota: result?.data?.quota };
}

async function verifyApiKey() {
  if (!configured || !currentUser) return;
  setStatus("AI 模式：正在驗證 API key");
  verifyAiButton.disabled = true;
  try {
    const result = await verifyApiKeyCallable();
    setStatus(result?.data?.ok ? `AI 模式：API 可用（${userName(currentUser)}）` : "AI 模式：API 驗證失敗");
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
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = error?.code || "";
    if (
      code.includes("popup-blocked") ||
      code.includes("popup-closed-by-user") ||
      code.includes("cancelled-popup-request")
    ) {
      setStatus("登入視窗未開啟，改用整頁登入。");
      await signInWithRedirect(auth, provider);
      return;
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
  const functions = getFunctions(app, functionRegion);
  const provider = new GoogleAuthProvider();
  generateTextCallable = httpsCallable(functions, "generateAiText");
  verifyApiKeyCallable = httpsCallable(functions, "verifyGeminiApiKey");

  show(signInButton, true);
  show(verifyAiButton, false);
  show(signOutButton, false);
  setStatus("");

  signInButton?.addEventListener("click", () => signInWithSchoolAccount(auth, provider));
  signOutButton?.addEventListener("click", () => signOut(auth));
  verifyAiButton?.addEventListener("click", verifyApiKey);
  getRedirectResult(auth).catch((error) => {
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
