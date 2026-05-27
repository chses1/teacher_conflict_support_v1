教師安心事件支援系統 v1

使用方式：
1. 直接用瀏覽器開啟 index.html。
2. 不需登入，不需網路，不會自動上傳資料。
3. 建議使用學生座號或代稱，不輸入學生全名、身分證字號、診斷名稱等敏感資訊。
4. 產生的文字請再次確認，不要加入未發生的事實或不存在的證據。
5. 本工具僅供事件紀錄、溝通與諮詢準備，不取代正式校內程序、主管機關判斷或法律專業意見。

主要功能：
- 教師心理支持（頁內 AI 或 Google AI Mode 備用提示詞）
- 事件分級
- 現場話術卡
- 事件紀錄產生器（事件紀錄、家長通知、行政協助）
- 家長通知潤飾（頁內 AI 或 Google AI Mode 備用提示詞）
- 校安事件通報單貼上版
- 教師自保檢核與避雷
- 國內判決搜尋輔助
- 案例搜尋輔助（頁內 AI 或 Google AI Mode 備用提示詞）
- 一鍵複製、匯出文字檔

Render / Gemini AI 模式：
1. 到 Firebase 建立專案，只啟用 Authentication 的 Google 登入。
   - Authorized domains 加入 Render 部署後的 onrender.com 網域。
   - 本工具頁內 AI 限 @apps.chses.tyc.edu.tw 帳號使用。
2. 到 Firebase 專案設定新增 Web App，將 Web App 設定放進 firebase-ai-config.js，或用部署流程產生。
3. 到 Firebase 專案設定 > Service accounts 產生 service account JSON。
4. 在 Render 建立 Web Service，連到 GitHub repository。
   - Build Command：npm install
   - Start Command：npm start
5. Render Environment Variables 需要新增：
   - GEMINI_API_KEY：Google AI Studio / Gemini API key
   - FIREBASE_SERVICE_ACCOUNT_JSON：Firebase service account JSON 內容
   - FIREBASE_PROJECT_ID：Firebase project id
   - FIREBASE_WEB_API_KEY：Firebase Web App 的 apiKey
   - FIREBASE_MESSAGING_SENDER_ID：Firebase Web App 的 messagingSenderId
   - FIREBASE_APP_ID：Firebase Web App 的 appId
   - FIREBASE_AUTH_DOMAIN：可省略，預設為 FIREBASE_PROJECT_ID.firebaseapp.com
   - FIREBASE_STORAGE_BUCKET：可省略，預設為 FIREBASE_PROJECT_ID.firebasestorage.app
   - FIREBASE_MEASUREMENT_ID：可省略
   - ALLOWED_EMAIL_DOMAIN：可省略，預設 apps.chses.tyc.edu.tw
   - GEMINI_MODEL：可省略，預設 gemini-2.0-flash
   - CORS_ALLOWED_ORIGIN：可省略；若前端和 Render API 分開部署，可填前端網址
6. 部署後，已登入且符合學校信箱網域時會走 Render API 產生頁內 AI 回覆；未登入、未設定或 API 暫時失敗時，仍會複製提示詞並開啟免費 Google AI Mode。

本機測試 Render 後端：
1. 安裝依賴：
   npm install
2. 設定環境變數：
   GEMINI_API_KEY
   FIREBASE_SERVICE_ACCOUNT_JSON
3. 啟動：
   npm start
4. 開啟：
   http://localhost:3000

安全提醒：
- Gemini API key 只放在 Render Environment Variables，不要寫進 index.html、firebase-ai.js、firebase-ai-config.js 或 GitHub。
- firebase-ai-config.js 內的 Firebase Web API key 不是 Gemini API key；它只用來啟動 Firebase Google 登入。
- Firebase 尚未設定、帳號不是 @apps.chses.tyc.edu.tw，或 Render API 暫時無法使用時，系統會維持原本的 Google AI Mode 複製提示詞備用流程。
