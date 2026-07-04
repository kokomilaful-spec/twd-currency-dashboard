import { BOT_BASE, fetchCsv, parseBotCsv, pickCurrencies, tradingDays } from '../_shared.js';

export default async function handler(req, res) {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 60);
    const dates = tradingDays(days);

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

    results.sort((a, b) => a.date.localeCompare(b.date));
    const trimmed = results.slice(-days);

    res.json({ ok: true, count: trimmed.length, history: trimmed });
  } catch (err) {
    console.error('history:', err);
    res.status(502).json({ ok: false, error: err.message });
  }
}
