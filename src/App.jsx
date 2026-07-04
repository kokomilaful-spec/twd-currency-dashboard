import { useState, useEffect, useCallback } from 'react';
import { fetchTodayRates, fetchHistory, buildDashboardData } from './currencyData';
import { loadExchanges, addExchange, deleteExchange } from './exchangeStore';
import Header from './components/Header';
import RateCard from './components/RateCard';
import TrendChart from './components/TrendChart';
import DailyInsight from './components/DailyInsight';
import CompanyVault from './components/CompanyVault';
import ExchangeForm from './components/ExchangeForm';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exchanges, setExchanges] = useState(() => loadExchanges());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [today, hist] = await Promise.all([
        fetchTodayRates(),
        fetchHistory(30),
      ]);
      if (!today.ok) throw new Error(today.error || '合作金庫今日無資料');
      if (!hist.ok) throw new Error(hist.error || '歷史資料載入失敗');
      setData(buildDashboardData(today, hist.history));
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddExchange = useCallback((entry) => {
    setExchanges((prev) => addExchange(prev, entry));
  }, []);

  const handleDeleteExchange = useCallback((id) => {
    setExchanges((prev) => deleteExchange(prev, id));
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-white/40">正在載入合作金庫匯率…</p>
          <p className="text-xs text-white/25 mt-1">載入 30 日歷史資料中</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="glass glow-red p-8 max-w-md text-center">
          <p className="text-danger font-semibold mb-2">無法載入匯率</p>
          <p className="text-sm text-white/50 mb-4">{error}</p>
          <p className="text-xs text-white/30 mb-4">
            請確認代理伺服器已啟動：
            <code className="block mt-1 text-accent bg-white/5 rounded px-2 py-1">npm run server</code>
          </p>
          <button
            onClick={load}
            className="glass glass-hover px-5 py-2 text-sm text-white/70 hover:text-white cursor-pointer"
          >
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Header
          lastUpdated={data.lastUpdated}
          onRefresh={load}
          loading={loading}
        />

        <DailyInsight usd={data.usd} eur={data.eur} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <RateCard data={data.usd} />
          <RateCard data={data.eur} />
        </div>

        <div className="mb-6">
          <CompanyVault
            records={exchanges}
            spotBuyUsd={data.usd.spotBuy}
            spotBuyEur={data.eur.spotBuy}
          />
        </div>

        <div className="mb-6">
          <ExchangeForm
            records={exchanges}
            currentRates={{
              usdSpotSell: data.usd.spotSell,
              eurSpotSell: data.eur.spotSell,
            }}
            onAdd={handleAddExchange}
            onDelete={handleDeleteExchange}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <TrendChart
            data={data.usd.history}
            avg={data.usd.avg30d}
            pair={data.usd.pair}
          />
          <TrendChart
            data={data.eur.history}
            avg={data.eur.avg30d}
            pair={data.eur.pair}
          />
        </div>

        <footer className="text-center text-xs text-white/20 mt-10 pb-4">
          資料來源：合作金庫牌告匯率 · 僅供參考，非投資建議
        </footer>
      </div>
    </div>
  );
}
