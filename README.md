# 教師安心事件支援系統 v1

## 使用方式

1. 直接用瀏覽器開啟 `index.html`。
2. 不需登入，不需網路，不會自動上傳資料。
3. 建議使用學生座號或代稱，不輸入學生全名、身分證字號、診斷名稱等敏感資訊。
4. 產生的文字請再次確認，不要加入未發生的事實或不存在的證據。
5. 本工具僅供事件紀錄、溝通與諮詢準備，不取代正式校內程序、主管機關判斷或法律專業意見。

## Render / Gemini AI 模式

1. 到 Firebase 建立專案，只啟用 Authentication 的 Google 登入。
2. 到 Firebase 專案設定新增 Web App，將 Web App 設定放進 `firebase-ai-config.js`，或用部署流程產生。
3. 到 Firebase 專案設定 > Service accounts 產生 service account JSON。
4. 在 Render 建立 Web Service，連到 GitHub repository。
   - Build Command：`npm install && npm run write:firebase-config`
   - Start Command：`npm start`
5. Render Environment Variables 需要新增：
   - `GEMINI_API_KEY`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_WEB_API_KEY`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`
   - 可選：`FIREBASE_AUTH_DOMAIN`、`FIREBASE_STORAGE_BUCKET`、`FIREBASE_MEASUREMENT_ID`、`ALLOWED_EMAIL_DOMAIN`、`GEMINI_MODEL`、`CORS_ALLOWED_ORIGIN`

## 半自動校園事件資料更新流程

1. 抓取來源並產生審核稿：
   ```bash
   npm run fetch:sources
   ```
2. 人工檢查 `data/drafts/campus-events-draft.json`。
   - draft 只供審核，不會被正式前端讀取。
   - draft 裡的數字都會標記 `status: "needs_review"`。
3. 手動整理並更新正式資料：
   ```text
   data/campus-events.json
   ```
4. 驗證正式資料與 draft 狀態：
   ```bash
   npm run validate:data
   ```
5. 確認後再部署網站。

## 安全提醒

- Gemini API key 只放在 Render Environment Variables，不要寫進前端檔案或 GitHub。
- `firebase-ai-config.js` 內的 Firebase Web API key 不是 Gemini API key；它只用來啟動 Firebase Google 登入。
- `data/drafts/campus-events-draft.json` 是人工審核用檔案，不應由正式前端讀取。
