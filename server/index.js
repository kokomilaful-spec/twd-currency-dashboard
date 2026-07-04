import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;
const BOT_BASE = 'https://rate.bot.com.tw/xrt/flcsv/0';

const RDSEC_API_KEY = process.env.RDSEC_API_KEY || '';
const RDSEC_BASE = 'https://api.rdsec.trendmicro.com/prod/aiendpoint/v1';

app.use(cors());

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------
// BOT CSV columns (per row):
//   0: Currency   1: "本行買入"   2: Cash Buy   3: Spot Buy
//   4-10: Forward Buy (10d–180d)
//   11: "本行賣出"  12: Cash Sell  13: Spot Sell
//   14-20: Forward Sell (10d–180d)
// ---------------------------------------------------------------------------

function parseBotCsv(csv) {
  const lines = csv
    .replace(/^\uFEFF/, '')          // strip BOM
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const rows = lines.slice(1); // skip header
  return rows.map((line) => {
    const cols = line.split(',');
    return {
      currency: cols[0],
      cashBuy: parseFloat(cols[2]) || null,
      spotBuy: parseFloat(cols[3]) || null,
      cashSell: parseFloat(cols[12]) || null,
      spotSell: parseFloat(cols[13]) || null,
    };
  });
}

function pickCurrencies(rows, codes = ['USD', 'EUR']) {
  const map = {};
  for (const row of rows) {
    if (codes.includes(row.currency)) {
      map[row.currency] = {
        ...row,
        spread: row.spotSell && row.spotBuy
          ? parseFloat((row.spotSell - row.spotBuy).toFixed(4))
          : null,
      };
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BOT returned ${res.status}`);
  const text = await res.text();
  // BOT returns a Chinese error string when no data for that date
  if (text.includes('找不到任何一筆資料')) return null;
  return text;
}

// Generate candidate weekdays going back far enough to account for holidays.
// We request 2x the desired count to handle multi-week closures (e.g. Lunar New Year).
function tradingDays(count) {
  const dates = [];
  const d = new Date();
  const maxCandidates = count * 3;
  let generated = 0;
  while (generated < maxCandidates) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) {
      const iso = d.toISOString().slice(0, 10);
      dates.push(iso);
      generated++;
    }
  }
  return dates; // most recent first — nulls from holidays are filtered downstream
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/rates/today
app.get('/api/rates/today', async (_req, res) => {
  try {
    const csv = await fetchCsv(`${BOT_BASE}/day`);
    if (!csv) return res.json({ ok: false, error: 'No data from BOT today' });

    const rows = parseBotCsv(csv);
    const rates = pickCurrencies(rows);

    res.json({ ok: true, date: new Date().toISOString().slice(0, 10), rates });
  } catch (err) {
    console.error('today:', err);
    res.status(502).json({ ok: false, error: err.message });
  }
});

// GET /api/rates/history?days=30
app.get('/api/rates/history', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 60);
    const dates = tradingDays(days);

    // Fetch in parallel, batched to avoid hammering BOT.
    // Stop early once we have enough successful results.
    const BATCH = 5;
    const results = [];

    for (let i = 0; i < dates.length && results.length < days; i += BATCH) {
      const batch = dates.slice(i, i + BATCH);
      const fetches = batch.map(async (date) => {
        try {
          const csv = await fetchCsv(`${BOT_BASE}/${date}`);
          if (!csv) return null;
          const rows = parseBotCsv(csv);
          const rates = pickCurrencies(rows);
          return { date, ...rates };
        } catch {
          return null;
        }
      });
      const batchResults = await Promise.all(fetches);
      results.push(...batchResults.filter(Boolean));
    }

    // Keep only the requested count, sorted oldest → newest
    results.sort((a, b) => a.date.localeCompare(b.date));
    const trimmed = results.slice(-days);

    res.json({ ok: true, count: trimmed.length, history: trimmed });
  } catch (err) {
    console.error('history:', err);
    res.status(502).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI Weekly Summary (Claude API)
// ---------------------------------------------------------------------------

// In-memory cache: one summary per calendar day
let summaryCache = { date: '', data: null };

app.get('/api/ai/weekly-summary', async (req, res) => {
  if (!RDSEC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'RDSEC_API_KEY not set' });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Return cached summary if already generated today
  if (summaryCache.date === today && summaryCache.data) {
    return res.json({ ...summaryCache.data, cached: true });
  }

  // Build recent rate context from query params
  const ratesParam = req.query.rates;
  let ratesContext = '';
  let dateRange = '';
  if (ratesParam) {
    try {
      const rates = JSON.parse(ratesParam);
      ratesContext = rates
        .map((r) => `${r.date}: 即期賣出 ${r.spotSell}, 即期買入 ${r.spotBuy}`)
        .join('\n');
      if (rates.length >= 2) {
        dateRange = `${rates[0].date} ~ ${rates[rates.length - 1].date}`;
      }
    } catch {
      // ignore parse errors
    }
  }

  const prompt = `你是一位專業的外匯市場分析師，專注於美元兌台幣（USD/TWD）的匯率分析。

以下是近一週的合作金庫美元兌台幣即期匯率資料：
${ratesContext || '（無歷史資料提供，請根據你的知識分析近期趨勢）'}

請用繁體中文產生一份「近一週美金對台幣匯率變動因素總結」。

回傳格式必須是**純 JSON**（不要加 markdown code block），結構如下：
{
  "verdict": "一句話總結本週匯率走勢（15-25 字）",
  "factors": [
    {
      "name": "因子名稱（4-8 字，如：聯準會降息預期）",
      "explanation": "為什麼這個因子影響匯率（一句話，20-40 字）",
      "impact": "bearish_usd 或 bullish_usd 或 neutral",
      "observation": "本週可觀察到的具體數據或現象（如：USD/TWD 本週 ↓ 0.25%）"
    }
  ]
}

要求：
- factors 陣列包含 3-4 個因子
- impact 只能是 bearish_usd（利空美元/利多台幣）、bullish_usd（利多美元/利空台幣）、neutral 三選一
- 語氣專業但易懂，適合一般換匯需求的使用者
- 不要給具體投資建議
- 今天日期是 ${today}
- 只回傳 JSON，不要加任何其他文字`;

  try {
    const apiRes = await fetch(`${RDSEC_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RDSEC_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'claude-4.5-haiku',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      console.error('RDSec API error:', apiRes.status, errBody);
      return res.status(502).json({ ok: false, error: `RDSec API ${apiRes.status}` });
    }

    const data = await apiRes.json();
    const rawText = (data.choices?.[0]?.message?.content || '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    // Try to parse structured JSON from Claude
    let result;
    try {
      const parsed = JSON.parse(rawText);
      if (parsed.verdict && Array.isArray(parsed.factors)) {
        result = {
          ok: true,
          date: today,
          dateRange,
          verdict: parsed.verdict,
          factors: parsed.factors,
          summary: null,
          cached: false,
        };
      } else {
        throw new Error('Missing verdict or factors');
      }
    } catch {
      // Fallback: return as plain text summary
      result = {
        ok: true,
        date: today,
        dateRange,
        verdict: null,
        factors: null,
        summary: rawText,
        cached: false,
      };
    }

    summaryCache = { date: today, data: result };
    res.json(result);
  } catch (err) {
    console.error('weekly-summary:', err);
    res.status(502).json({ ok: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`BOT proxy running → http://localhost:${PORT}`);
});
