import { TrendingDown, TrendingUp, DollarSign, Euro, AlertTriangle } from 'lucide-react';

const signalStyles = {
  buy: { glow: 'glow-green', badge: 'bg-buy/15 text-buy', dot: 'bg-buy' },
  sell: { glow: 'glow-orange', badge: 'bg-sell/15 text-sell', dot: 'bg-sell' },
  neutral: { glow: 'glow-accent', badge: 'bg-accent/15 text-accent', dot: 'bg-accent' },
};

const signalLabel = {
  'Cost Saving': '適合買入',
  'Above Avg': '高於均價',
  'At Average': '持平觀望',
  'No Data': '無資料',
};

export default function RateCard({ data }) {
  const style = signalStyles[data.signal.color];
  const Icon = data.currency === 'USD' ? DollarSign : Euro;
  const isSaving = data.signal.color === 'buy';
  const label = signalLabel[data.signal.signal] || data.signal.signal;

  return (
    <div className={`glass ${style.glow} p-6 animate-slide-up`}>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5">
            <Icon size={22} className="text-white/80" />
          </div>
          <div>
            <span className="font-semibold text-lg text-white/90">{data.pair}</span>
            <p className="text-[11px] text-white/35">合作金庫牌告匯率</p>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${style.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse-soft`} />
          {label}
        </span>
      </div>

      {/* 即期賣出 = 你的成本 */}
      <div className="mb-1">
        <p className="text-xs text-white/40 mb-1">即期賣出（你的買入成本）</p>
        <p className="text-4xl font-bold tracking-tight text-white">
          {data.spotSell?.toFixed(4) ?? '—'}
        </p>
      </div>

      {/* 與均價差異 */}
      <div className="flex items-center gap-1.5 mb-5">
        {data.signal.diff < 0 ? (
          <TrendingDown size={14} className="text-buy" />
        ) : (
          <TrendingUp size={14} className="text-sell" />
        )}
        <span className={`text-sm font-medium ${data.signal.diff < 0 ? 'text-buy' : 'text-sell'}`}>
          {data.signal.diff > 0 ? '+' : ''}{data.signal.diff.toFixed(2)}%
        </span>
        <span className="text-xs text-white/40 ml-1">較 30 日均價</span>
      </div>

      {/* 省錢提醒 */}
      {isSaving && (
        <div className="flex items-center gap-2 bg-buy/8 border border-buy/20 rounded-lg px-3 py-2 mb-4">
          <AlertTriangle size={14} className="text-buy shrink-0" />
          <p className="text-xs text-buy font-medium">
            省錢機會 — 低於 30 日均價 {Math.abs(data.signal.diff).toFixed(2)}%
          </p>
        </div>
      )}

      {/* 關鍵數據 */}
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="30日均價" value={data.avg30d?.toFixed(4)} />
        <Stat
          label="匯差(買賣價差)"
          value={data.spread?.toFixed(4)}
          sub={`即期買入 ${data.spotBuy?.toFixed(4) ?? '—'}`}
        />
        <Stat label="30日最低" value={data.min30d?.toFixed(4)} />
        <Stat label="30日最高" value={data.max30d?.toFixed(4)} />
      </div>

      {/* 均線對比 */}
      {(data.ma5 || data.ma10 || data.ma20) && (
        <div className="flex gap-2 mt-2.5">
          {[
            { label: 'MA5',  val: data.ma5 },
            { label: 'MA10', val: data.ma10 },
            { label: 'MA20', val: data.ma20 },
          ].map(({ label, val }) => {
            if (!val) return null;
            const diff = data.spotSell - val;
            const isAbove = diff > 0;
            return (
              <div key={label} className="flex-1 bg-white/[0.03] rounded-lg p-2">
                <p className="text-[10px] text-white/35 mb-0.5">{label}</p>
                <p className="text-xs font-medium text-white/65">{val.toFixed(2)}</p>
                <p className={`text-[10px] font-medium ${isAbove ? 'text-sell' : 'text-buy'}`}>
                  {isAbove ? '+' : ''}{diff.toFixed(3)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white/[0.03] rounded-lg p-2.5">
      <p className="text-[11px] text-white/40 tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-white/80 mt-0.5">{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}
