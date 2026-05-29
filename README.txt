教師安心事件支援系統 v1

使用方式：
1. 直接用瀏覽器開啟 index.html。
2. 不需登入，不需網路，不會自動上傳資料。
3. 建議使用學生座號或代稱，不輸入學生全名、身分證字號、診斷名稱等敏感資訊。
4. 產生的文字請再次確認，不要加入未發生的事實或不存在的證據。
5. 本工具僅供事件紀錄、溝通與諮詢準備，不取代正式校內程序、主管機關判斷或法律專業意見。

主要功能：
- 教師心理支持（Google AI Mode 提示詞）
- 事件分級
- 現場話術卡
- 事件紀錄產生器（事件紀錄、家長通知、行政協助）
- 家長通知潤飾（Google AI Mode 提示詞）
- 校安事件通報單貼上版
- 教師自保檢核與避雷
- 國內判決搜尋輔助
- 案例搜尋輔助（Google AI Mode 提示詞）
- 一鍵複製、匯出文字檔

Google AI Mode 模式：
1. 不需要設定 API key。
2. 家長通知、心理支持與案例搜尋會先產生提示詞。
3. 系統會自動複製提示詞並開啟 Google AI Mode。
4. 請在 Google AI Mode 貼上提示詞後送出，再把回覆內容帶回來確認與使用。

半自動校園事件資料更新流程：
1. 抓取來源並產生審核稿：
   npm run fetch:sources
2. 人工檢查 data/drafts/campus-events-draft.json。
   - draft 只供審核，不會被正式前端讀取。
   - draft 裡的數字都會標記 status: "needs_review"。
3. 手動整理並更新正式資料：
   data/campus-events.json
4. 驗證正式資料與 draft 狀態：
   npm run validate:data
5. 確認後再部署網站。

教育新聞跑馬燈：
1. GitHub Actions 會每天台灣時間清晨自動抓取 Google News 台灣教育相關 RSS。
2. 發布網站會讀取 data/education-news.json，在「台灣校園事件年度摘要」內顯示近期熱門教育新聞。
3. 點擊新聞標題會開啟來源頁面；內容仍請以來源網站實際頁面為準。

安全提醒：
- 本工具不會儲存或上傳事件內容；提示詞會複製到剪貼簿並交由您貼到 Google AI Mode。
- 回貼給家長、行政或法律諮詢窗口前，請再次確認內容沒有新增未發生的事實，也沒有學生可識別個資。
- data/drafts/campus-events-draft.json 是人工審核用檔案，不會被 GitHub Pages 部署流程放到正式網站。
