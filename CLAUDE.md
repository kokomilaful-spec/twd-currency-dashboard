# 台幣匯率儀表板 — Claude Code 專案說明

## 專案目的
公司內部換匯決策工具，串接合作金庫（BOT）牌告匯率，追蹤 USD/EUR 即期匯率、均線訊號、公司外匯庫存損益。

## 啟動方式（必須同時跑兩個 process）

```bash
# Terminal 1 — Express proxy（爬合作金庫 CSV，port 3001）
npm run server

# Terminal 2 — Vite 前端（port 5173）
npm run dev
```

瀏覽器開 http://localhost:5173。

Vite 已設 proxy：所有 `/api/*` 請求自動轉到 `http://localhost:3001`（見 `vite.config.js`）。

## 環境變數

| 變數 | 用途 | 必填 |
|------|------|------|
| `RDSEC_API_KEY` | AI 週報摘要（Claude API via RDSEC endpoint） | 否，沒設則 `/api/ai/weekly-summary` 回 500 |

建議在專案根目錄建 `.env`（已在 `.gitignore`，不會進 repo）：
```
RDSEC_API_KEY=你的金鑰
```

## 技術棧

- **前端**：React 19 + Vite 7 + Tailwind CSS 4 + Recharts 3
- **後端**：Node.js (ESM) + Express 5，單一檔案 `server/index.js`
- **資料來源**：合作金庫牌告匯率 CSV `https://rate.bot.com.tw/xrt/flcsv/0/`

## 專案結構

```
twd-currency-dashboard/
├── server/
│   └── index.js          # Express proxy，直接爬 BOT CSV（含 AI 週報端點）
├── api/                  # Vercel Functions 版本（備用，部署到 Vercel 時用這個）
│   ├── _shared.js
│   ├── rates/today.js
│   ├── rates/history.js
│   └── ai/weekly-summary.js
├── src/
│   ├── currencyData.js   # 資料層：fetch API、buildDashboardData、MA 計算
│   ├── exchangeStore.js  # 換匯紀錄 CRUD（localStorage）
│   ├── App.jsx           # 主元件，組裝所有 section
│   └── components/
│       ├── RateCard.jsx      # 即期匯率卡（含 MA5/MA10/MA20 對比）
│       ├── TrendChart.jsx    # 30日走勢圖（ComposedChart + MA 線 toggle）
│       ├── DailyInsight.jsx  # 換匯建議（基於 30日均價訊號）
│       ├── CompanyVault.jsx  # 公司外匯庫存 + 未實現損益
│       ├── ExchangeForm.jsx  # 新增/刪除換匯紀錄
│       └── Header.jsx
└── vercel.json           # Vercel 部署設定
```

## 資料流

```
BOT CSV (合作金庫)
  └─> server/index.js (Express)
        ├─> GET /api/rates/today   → 今日即期/現鈔買賣
        └─> GET /api/rates/history?days=30 → 過去 30 交易日歷史
              └─> src/currencyData.js
                    ├─> addMAs()  → 計算 MA5/MA10/MA20（掛在每個歷史點）
                    └─> buildDashboardData() → 組成 {usd, eur} 物件
                          └─> App.jsx → 分發給各元件
```

## 已知問題 / 待辦

1. **History API 無快取**：每次 page load 對 BOT 發 ~30 個 HTTP request，速度慢。建議加 Vercel KV 或 node-cache 快取一天。
2. **假日未過濾**：`tradingDays()` 只跳週六日，台灣國定假日 BOT 無資料會被 filter 掉，30 日歷史可能實際不足 30 筆。
3. **AI 週報未接前端**：`fetchWeeklySummary()` 已在 `currencyData.js` 寫好，`/api/ai/weekly-summary` 後端也完整，但 `App.jsx` 尚未呼叫。
4. **幣別固定 USD/EUR**：如需擴充 JPY/GBP，要改 `buildDashboardData`、`server/index.js` 的 `pickCurrencies()`、以及前端 `App.jsx`。

## MA 均線設計說明

- MA5 = 黃色、MA10 = 橘色、MA20 = 紅色
- TrendChart 預設顯示 MA5 + MA20，點擊 pill 可切換
- RateCard 下方顯示各均線數值及即期與均線的差值（正數橘色 = 高於均線，負數綠色 = 低於均線）
- 歷史資料不足時（如前 4 天算不出 MA5）該點填 null，recharts 的 `connectNulls={false}` 讓線段自然斷開

## 資料準確性驗證（2026-07-04）

合庫 BOT 資料與 ExchangeRate-API 中間價交叉比對：
- USD 中間價 31.969，落在合庫買賣區間 31.87–32.02 ✅
- EUR 中間價 36.536，落在合庫買賣區間 36.245–36.845 ✅
