import { Activity, RefreshCw } from 'lucide-react';

export default function Header({ lastUpdated, onRefresh, loading }) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent/15 text-accent">
          <Activity size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            台幣匯率儀表板
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            合作金庫即時匯率 · 換匯訊號 · 庫存追蹤
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-white/40">
          更新於 {lastUpdated}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="glass glass-hover flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          重新整理
        </button>
      </div>
    </header>
  );
}
