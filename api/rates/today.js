import { BOT_BASE, fetchCsv, parseBotCsv, pickCurrencies } from '../_shared.js';

export default async function handler(req, res) {
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
}
