export async function fetchTodayRates() {
  const res = await fetch('/api/rates/today');
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  return res.json();
}

export async function fetchHistory(days = 30) {
  const res = await fetch(`/api/rates/history?days=${days}`);
  if (!res.ok) throw new Error(`Proxy error ${res.status}`);
  return res.json();
}

export function buildDashboardData(today, history) {
  const usdToday = today.rates.USD;
  const eurToday = today.rates.EUR;
  const todayDate = today.date;

  const usdHistory = addMAs([
    ...history
      .filter((d) => d.USD && d.date !== todayDate)
      .map((d) => ({
        date: formatDate(d.date),
        fullDate: d.date,
        spotSell: d.USD.spotSell,
        spotBuy: d.USD.spotBuy,
      })),
    {
      date: formatDate(todayDate),
      fullDate: todayDate,
      spotSell: usdToday.spotSell,
      spotBuy: usdToday.spotBuy,
      isToday: true,
    },
  ]);

  const eurHistory = addMAs([
    ...history
      .filter((d) => d.EUR && d.date !== todayDate)
      .map((d) => ({
        date: formatDate(d.date),
        fullDate: d.date,
        spotSell: d.EUR.spotSell,
        spotBuy: d.EUR.spotBuy,
      })),
    {
      date: formatDate(todayDate),
      fullDate: todayDate,
      spotSell: eurToday.spotSell,
      spotBuy: eurToday.spotBuy,
      isToday: true,
    },
  ]);

  const usdAvg = avg(usdHistory.map((d) => d.spotSell));
  const eurAvg = avg(eurHistory.map((d) => d.spotSell));

  const usdLast = usdHistory[usdHistory.length - 1] ?? {};
  const eurLast = eurHistory[eurHistory.length - 1] ?? {};

  return {
    usd: {
      pair: 'USD / TWD',
      currency: 'USD',
      spotSell: usdToday.spotSell,
      spotBuy: usdToday.spotBuy,
      cashSell: usdToday.cashSell,
      cashBuy: usdToday.cashBuy,
      spread: usdToday.spread,
      avg30d: round(usdAvg),
      min30d: round(Math.min(...usdHistory.map((d) => d.spotSell))),
      max30d: round(Math.max(...usdHistory.map((d) => d.spotSell))),
      ma5: usdLast.ma5 ?? null,
      ma10: usdLast.ma10 ?? null,
      ma20: usdLast.ma20 ?? null,
      signal: getSignal(usdToday.spotSell, usdAvg),
      history: usdHistory,
    },
    eur: {
      pair: 'EUR / TWD',
      currency: 'EUR',
      spotSell: eurToday.spotSell,
      spotBuy: eurToday.spotBuy,
      cashSell: eurToday.cashSell,
      cashBuy: eurToday.cashBuy,
      spread: eurToday.spread,
      avg30d: round(eurAvg),
      min30d: round(Math.min(...eurHistory.map((d) => d.spotSell))),
      max30d: round(Math.max(...eurHistory.map((d) => d.spotSell))),
      ma5: eurLast.ma5 ?? null,
      ma10: eurLast.ma10 ?? null,
      ma20: eurLast.ma20 ?? null,
      signal: getSignal(eurToday.spotSell, eurAvg),
      history: eurHistory,
    },
    lastUpdated: new Date().toLocaleString(),
  };
}

export async function fetchWeeklySummary(usdHistory) {
  // Send the last 7 data points as context
  const recent = (usdHistory || []).slice(-7);
  const params = new URLSearchParams({
    rates: JSON.stringify(recent.map((d) => ({
      date: d.fullDate || d.date,
      spotSell: d.spotSell,
      spotBuy: d.spotBuy,
    }))),
  });
  const res = await fetch(`/api/ai/weekly-summary?${params}`);
  if (!res.ok) throw new Error(`AI summary error ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function round(n) {
  return parseFloat(n.toFixed(4));
}

function addMAs(data, windows = [5, 10, 20]) {
  return data.map((d, i) => {
    const extra = {};
    for (const w of windows) {
      if (i + 1 >= w) {
        const slice = data.slice(i + 1 - w, i + 1);
        extra[`ma${w}`] = round(avg(slice.map((x) => x.spotSell)));
      } else {
        extra[`ma${w}`] = null;
      }
    }
    return { ...d, ...extra };
  });
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getSignal(current, avg30d) {
  if (!current || !avg30d) return { signal: 'No Data', color: 'neutral', diff: 0 };
  const diff = ((current - avg30d) / avg30d) * 100;
  if (diff < -0.3) return { signal: 'Cost Saving', color: 'buy', diff };
  if (diff > 0.3) return { signal: 'Above Avg', color: 'sell', diff };
  return { signal: 'At Average', color: 'neutral', diff };
}
