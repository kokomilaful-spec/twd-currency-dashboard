const BOT_BASE = 'https://rate.bot.com.tw/xrt/flcsv/0';

export function parseBotCsv(csv) {
  const lines = csv
    .replace(/^\uFEFF/, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const rows = lines.slice(1);
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

export function pickCurrencies(rows, codes = ['USD', 'EUR']) {
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

export async function fetchCsv(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BOT returned ${res.status}`);
  const text = await res.text();
  if (text.includes('找不到任何一筆資料')) return null;
  return text;
}

export function tradingDays(count) {
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
  return dates;
}

export { BOT_BASE };
