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

Firebase / Gemini AI 模式：
1. 到 Firebase 建立專案，啟用 Authentication 的 Google 登入。
   - Authorized domains 加入 Firebase Hosting 網域。
   - 本工具頁內 AI 限 @apps.chses.tyc.edu.tw 帳號使用。
2. 到 Firebase 專案設定新增 Web App，將設定填入 firebase-ai.js：
   - apiKey
   - authDomain
   - projectId
   - appId
3. 將 .firebaserc 的 REPLACE_WITH_FIREBASE_PROJECT_ID 改成 Firebase project id。
4. 啟用 Firestore，用來記錄每個帳號每日頁內 AI 使用次數。
5. 安裝 Firebase CLI 後，設定 Gemini API key：
   firebase functions:secrets:set GEMINI_API_KEY
6. 預設模型為 gemini-2.0-flash；需要更換時可調整 functions/index.js 的 GEMINI_MODEL 參數預設值。
7. 預設每個帳號每天可用 5 次頁內 AI；全校每月共用上限 100 次。需要更換時可調整 functions/index.js 的 DAILY_AI_LIMIT 與 MONTHLY_SCHOOL_AI_LIMIT 參數預設值。
8. 部署：
   firebase deploy --only hosting,functions

GitHub 自動部署：
1. GitHub repository secrets 需要新增：
   - FIREBASE_PROJECT_ID：Firebase project id
   - FIREBASE_SERVICE_ACCOUNT：Firebase service account JSON 內容
2. push 到 main 後，.github/workflows/firebase-deploy.yml 會部署 Hosting 和 Functions。
3. Firebase Authentication 的 Authorized domains 需加入部署後的 Firebase Hosting 網域。

安全提醒：
- Gemini API key 只放在 Firebase Secret，不要寫進 index.html、firebase-ai.js 或 GitHub。
- firebase-ai.js 內的 Firebase Web API key 不是 Gemini API key；它用來連線 Firebase 專案，仍應搭配 Firebase Auth 與 Functions 權限控管。
- Firebase 尚未設定、帳號不是 @apps.chses.tyc.edu.tw，或個人/全校額度用完時，系統會維持原本的 Google AI Mode 複製提示詞備用流程。
