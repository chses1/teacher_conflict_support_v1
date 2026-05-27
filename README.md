# 教師安心事件支援系統 v1

## 使用方式

1. 直接用瀏覽器開啟 `index.html`。
2. 不需登入，不需網路，不會自動上傳資料。
3. 建議使用學生座號或代稱，不輸入學生全名、身分證字號、診斷名稱等敏感資訊。
4. 產生的文字請再次確認，不要加入未發生的事實或不存在的證據。
5. 本工具僅供事件紀錄、溝通與諮詢準備，不取代正式校內程序、主管機關判斷或法律專業意見。

## 單機版 / Gemini AI 模式

1. GitHub repository secrets 新增：
   - `GEMINI_API_KEY`：Google AI Studio 的免費 Gemini API key
2. GitHub repository variables 可選新增：
   - `GEMINI_MODEL`：預設 `gemini-2.0-flash`
3. push 到 `main` 後，GitHub Actions 會先產生 `ai-config.js`，再部署 GitHub Pages。
4. 若沒有設定 API key、額度用完或頁內 AI 暫時失敗，系統會自動改用 Google AI Mode 備用流程。

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

- 單機版會把 Gemini API key 打包到前端設定檔；公開網站上的使用者有機會在瀏覽器中看到 key。
- 建議只使用免費額度 key，並在 Google Cloud / AI Studio 監控用量；若 key 外洩，可停用舊 key 並更換 GitHub secret。
- `data/drafts/campus-events-draft.json` 是人工審核用檔案，不會被 GitHub Pages 部署流程放到正式網站。
