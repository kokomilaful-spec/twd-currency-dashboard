const RDSEC_API_KEY = process.env.RDSEC_API_KEY || '';
const RDSEC_BASE = 'https://api.rdsec.trendmicro.com/prod/aiendpoint/v1';

export default async function handler(req, res) {
  if (!RDSEC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'RDSEC_API_KEY not set' });
  }

  const today = new Date().toISOString().slice(0, 10);

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

    res.json(result);
  } catch (err) {
    console.error('weekly-summary:', err);
    res.status(502).json({ ok: false, error: err.message });
  }
}
