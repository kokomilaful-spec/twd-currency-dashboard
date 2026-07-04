import { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
  BadgeDollarSign,
  BrainCircuit,
  Loader2,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Database,
} from 'lucide-react';
import { fetchWeeklySummary } from '../currencyData';

// ---------------------------------------------------------------------------
// Signal logic
// ---------------------------------------------------------------------------

function getVerdict(usd, eur) {
  const buyCount = [usd, eur].filter((d) => d.signal.color === 'buy').length;
  if (buyCount === 2) return { label: '今天適合換匯', vibe: 'buy' };
  if (buyCount === 1) return { label: '部分幣別有利', vibe: 'neutral' };
  return { label: '建議再觀望', vibe: 'sell' };
}

function getCurrencyInsight(data) {
  const diff = data.signal.diff;
  if (diff < -0.3) {
    const saving = (data.avg30d - data.spotSell).toFixed(3);
    return {
      icon: ArrowDownCircle,
      color: 'text-buy',
      badgeClass: 'bg-buy/10 text-buy border-buy/20',
      label: '低於均價',
      text: `即期賣出 ${data.spotSell.toFixed(2)}，低於 30 日均價 ${Math.abs(diff).toFixed(2)}%，每單位可省 NT$${saving}`,
    };
  }
  if (diff > 0.3) {
    return {
      icon: ArrowUpCircle,
      color: 'text-sell',
      badgeClass: 'bg-sell/10 text-sell border-sell/20',
      label: '高於均價',
      text: `即期賣出 ${data.spotSell.toFixed(2)}，高於 30 日均價 ${diff.toFixed(2)}%（均價 ${data.avg30d.toFixed(2)}）`,
    };
  }
  return {
    icon: MinusCircle,
    color: 'text-accent',
    badgeClass: 'bg-accent/10 text-accent border-accent/20',
    label: '持平',
    text: `即期賣出 ${data.spotSell.toFixed(2)}，接近 30 日均價 ${data.avg30d.toFixed(2)}，無明顯價差`,
  };
}

// ---------------------------------------------------------------------------
// Verdict styles
// ---------------------------------------------------------------------------

const verdictStyles = {
  buy: {
    bg: 'bg-buy/8',
    border: 'border-buy/25',
    text: 'text-buy',
    desc: '美元與歐元皆低於 30 日均價，現在換匯成本較低。',
  },
  sell: {
    bg: 'bg-sell/8',
    border: 'border-sell/25',
    text: 'text-sell',
    desc: '目前匯率在均價或以上，等待更好的時機可能更划算。',
  },
  neutral: {
    bg: 'bg-accent/8',
    border: 'border-accent/25',
    text: 'text-accent',
    desc: '訊號不一致，其中一個幣別較有利，請參考下方細節。',
  },
};

// ---------------------------------------------------------------------------
// Factor card helpers
// ---------------------------------------------------------------------------

const impactConfig = {
  bearish_usd: {
    icon: TrendingDown,
    label: '利空美元',
    className: 'text-buy',
    badgeClass: 'bg-buy/10 text-buy border-buy/20',
  },
  bullish_usd: {
    icon: TrendingUp,
    label: '利多美元',
    className: 'text-sell',
    badgeClass: 'bg-sell/10 text-sell border-sell/20',
  },
  neutral: {
    icon: ArrowRight,
    label: '中性',
    className: 'text-white/40',
    badgeClass: 'bg-white/5 text-white/40 border-white/10',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DailyInsight({ usd, eur }) {
  const verdict = getVerdict(usd, eur);
  const vs = verdictStyles[verdict.vibe];
  const usdInsight = getCurrencyInsight(usd);
  const eurInsight = getCurrencyInsight(eur);

  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    setAiError(null);

    fetchWeeklySummary(usd.history)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setAiData(res);
        } else {
          setAiError(res.error || '無法取得 AI 摘要');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setAiError(err.message);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => { cancelled = true; };
  }, [usd.history]);

  const todayStr = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div className="glass glow-accent p-6 mb-6 animate-slide-up">

      {/* ── Hero verdict ── */}
      <div className={`rounded-2xl border ${vs.border} ${vs.bg} p-5 mb-5`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <Sparkles size={20} className="text-amber-400" />
            <h2 className="text-lg font-bold text-white/95">今日換匯建議</h2>
          </div>
          <span className="text-xs text-white/30">{todayStr}</span>
        </div>

        <div className="flex items-baseline gap-3 mt-3">
          <span className={`text-2xl font-extrabold ${vs.text}`}>
            {verdict.label}
          </span>
        </div>
        <p className="text-sm text-white/55 mt-1.5 leading-relaxed">{vs.desc}</p>
      </div>

      {/* ── Currency breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {[
          { label: '美元 USD', insight: usdInsight },
          { label: '歐元 EUR', insight: eurInsight },
        ].map(({ label, insight }) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <insight.icon size={20} className={`${insight.color} mt-0.5 shrink-0`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white/85">{label}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${insight.badgeClass}`}>
                  {insight.label}
                </span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{insight.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Spread info ── */}
      <div className="flex items-center gap-2 text-xs text-white/35 mb-5 px-1">
        <BadgeDollarSign size={14} className="shrink-0" />
        <span>
          今日匯差：美元 {usd.spread?.toFixed(3) ?? '—'} · 歐元 {eur.spread?.toFixed(3) ?? '—'}
          <span className="text-white/25 ml-1">（匯差越小，交易成本越低）</span>
        </span>
      </div>

      {/* ── AI Weekly Factor Analysis ── */}
      <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-5">
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit size={16} className="text-violet-400" />
          <h4 className="text-sm font-semibold text-white/80">
            一週匯率變動因素
          </h4>
          <span className="text-[10px] text-violet-400/60 font-medium px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/15">
            AI 分析
          </span>
          {aiLoading && <Loader2 size={14} className="animate-spin text-white/30 ml-auto" />}
        </div>

        {/* Loading skeleton */}
        {aiLoading && !aiData && (
          <div className="space-y-3">
            <div className="h-4 bg-white/5 rounded animate-pulse w-2/3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 space-y-2">
                  <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-full" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-2/3" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {aiError && (
          <p className="text-xs text-red-400/70 leading-relaxed">
            暫時無法產生分析：{aiError}
          </p>
        )}

        {/* Structured factor cards */}
        {aiData && aiData.factors && (
          <>
            {/* AI verdict headline */}
            <p className="text-sm font-medium text-violet-300/80 mb-4">
              {aiData.verdict}
            </p>

            {/* Factor cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {aiData.factors.map((factor, i) => {
                const impact = impactConfig[factor.impact] || impactConfig.neutral;
                const ImpactIcon = impact.icon;
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ImpactIcon size={14} className={`${impact.className} shrink-0`} />
                      <span className="text-xs font-semibold text-white/80 truncate">
                        {factor.name}
                      </span>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ml-auto shrink-0 ${impact.badgeClass}`}>
                        {impact.label}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed mb-2">
                      {factor.explanation}
                    </p>
                    {factor.observation && (
                      <p className="text-[11px] text-white/30 leading-relaxed">
                        <span className="text-white/20 mr-1">▸</span>
                        {factor.observation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Data source attribution */}
            <div className="flex items-center gap-1.5 text-[10px] text-white/20">
              <Database size={10} className="shrink-0" />
              <span>
                分析依據：合作金庫即期匯率
                {aiData.dateRange && `（${aiData.dateRange}）`}
              </span>
            </div>
          </>
        )}

        {/* Fallback: plain text summary */}
        {aiData && !aiData.factors && aiData.summary && (
          <p className="text-sm text-white/55 leading-relaxed whitespace-pre-line">
            {aiData.summary}
          </p>
        )}
      </div>
    </div>
  );
}
