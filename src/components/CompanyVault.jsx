import { Vault, TrendingUp, TrendingDown, Minus, DollarSign, Euro } from 'lucide-react';
import { calcHoldings, calcPnl } from '../exchangeStore';

const currencyMeta = {
  USD: { icon: DollarSign, label: '美元 USD' },
  EUR: { icon: Euro, label: '歐元 EUR' },
};

const directionStyle = {
  gain: { text: 'text-buy', bg: 'bg-buy/8 border-buy/20', icon: TrendingUp, label: '未實現獲利' },
  loss: { text: 'text-danger', bg: 'bg-danger/8 border-danger/20', icon: TrendingDown, label: '未實現虧損' },
  neutral: { text: 'text-white/40', bg: 'bg-white/5 border-white/10', icon: Minus, label: '尚無部位' },
};

function CurrencyVault({ currency, records, spotBuy }) {
  const holdings = calcHoldings(records, currency);
  const pnl = calcPnl(holdings, spotBuy);
  const style = directionStyle[pnl.direction];
  const meta = currencyMeta[currency];
  const Icon = meta.icon;
  const PnlIcon = style.icon;

  if (holdings.txCount === 0) {
    return (
      <div className="bg-white/[0.02] rounded-xl p-5 border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={18} className="text-white/30" />
          <span className="text-sm font-medium text-white/40">{meta.label}</span>
        </div>
        <p className="text-xs text-white/25">尚無換匯紀錄，請在下方新增第一筆。</p>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] rounded-xl p-5 border border-white/5">
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={18} className="text-white/70" />
          <span className="text-sm font-medium text-white/80">{meta.label}</span>
        </div>
        <span className="text-[11px] text-white/30">共 {holdings.txCount} 筆交易</span>
      </div>

      {/* 餘額 */}
      <div className="mb-4">
        <p className="text-xs text-white/40 mb-0.5">目前庫存餘額</p>
        <p className="text-2xl font-bold text-white tracking-tight">
          {currency} {holdings.totalForeign.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* 統計列 */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-[11px] text-white/40 tracking-wider">加權平均成本</p>
          <p className="text-sm font-semibold text-white/80 mt-0.5">
            {holdings.avgCost.toFixed(4)}
          </p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-[11px] text-white/40 tracking-wider">累計投入</p>
          <p className="text-sm font-semibold text-white/80 mt-0.5">
            NT$ {holdings.totalTwdSpent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* 損益區塊 */}
      <div className={`rounded-lg border p-3 ${style.bg}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <PnlIcon size={14} className={style.text} />
            <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
          </div>
          <span className="text-[11px] text-white/30">
            比較即期買入 {spotBuy?.toFixed(4) ?? '—'}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <p className={`text-lg font-bold ${style.text}`}>
            {pnl.unrealizedTwd >= 0 ? '+' : ''}NT$ {pnl.unrealizedTwd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <span className={`text-xs ${style.text}`}>
            ({pnl.unrealizedPct >= 0 ? '+' : ''}{pnl.unrealizedPct.toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CompanyVault({ records, spotBuyUsd, spotBuyEur }) {
  return (
    <div className="glass glow-accent p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-5">
        <Vault size={20} className="text-amber-400" />
        <h3 className="font-semibold text-white/90">公司外匯庫存</h3>
        <span className="text-xs text-white/30 ml-1">庫存匯率計算</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CurrencyVault currency="USD" records={records} spotBuy={spotBuyUsd} />
        <CurrencyVault currency="EUR" records={records} spotBuy={spotBuyEur} />
      </div>
    </div>
  );
}
