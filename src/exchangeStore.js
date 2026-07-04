const STORAGE_KEY = 'twd-dashboard-exchanges';

export function loadExchanges() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExchanges(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function addExchange(records, entry) {
  const next = [
    ...records,
    {
      id: crypto.randomUUID(),
      date: entry.date,
      currency: entry.currency,         // 'USD' | 'EUR'
      amountForeign: entry.amountForeign, // foreign currency bought
      rate: entry.rate,                   // spot sell rate at time of purchase
      twdSpent: entry.amountForeign * entry.rate,
      createdAt: new Date().toISOString(),
    },
  ];
  saveExchanges(next);
  return next;
}

export function deleteExchange(records, id) {
  const next = records.filter((r) => r.id !== id);
  saveExchanges(next);
  return next;
}

// ---------------------------------------------------------------------------
// Weighted Average Cost & P&L
// ---------------------------------------------------------------------------

export function calcHoldings(records, currency) {
  const filtered = records.filter((r) => r.currency === currency);
  if (filtered.length === 0) {
    return {
      currency,
      totalForeign: 0,
      totalTwdSpent: 0,
      avgCost: 0,
      txCount: 0,
    };
  }

  const totalForeign = filtered.reduce((s, r) => s + r.amountForeign, 0);
  const totalTwdSpent = filtered.reduce((s, r) => s + r.twdSpent, 0);

  return {
    currency,
    totalForeign,
    totalTwdSpent,
    avgCost: totalTwdSpent / totalForeign,   // 加權平均成本
    txCount: filtered.length,
  };
}

export function calcPnl(holdings, currentSpotBuy) {
  if (!holdings.totalForeign || !currentSpotBuy) {
    return { unrealizedTwd: 0, unrealizedPct: 0, direction: 'neutral' };
  }

  // If we sell now at Spot Buy, we get:
  const marketValue = holdings.totalForeign * currentSpotBuy;
  const unrealizedTwd = marketValue - holdings.totalTwdSpent;
  const unrealizedPct = (unrealizedTwd / holdings.totalTwdSpent) * 100;

  let direction = 'neutral';
  if (unrealizedTwd > 0) direction = 'gain';
  else if (unrealizedTwd < 0) direction = 'loss';

  return { unrealizedTwd, unrealizedPct, direction, marketValue };
}
