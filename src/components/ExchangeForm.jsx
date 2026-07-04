import { useState } from 'react';
import { Plus, Trash2, History } from 'lucide-react';

export default function ExchangeForm({ records, currentRates, onAdd, onDelete }) {
  const [currency, setCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showHistory, setShowHistory] = useState(false);

  const prefillRate = () => {
    if (!currentRates) return;
    const r = currency === 'USD' ? currentRates.usdSpotSell : currentRates.eurSpotSell;
    if (r) setRate(r.toString());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    const rateNum = parseFloat(rate);
    if (!amountNum || amountNum <= 0 || !rateNum || rateNum <= 0) return;

    onAdd({
      date,
      currency,
      amountForeign: amountNum,
      rate: rateNum,
    });
    setAmount('');
    setRate('');
  };

  const filteredRecords = [...records]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="glass glow-accent p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Plus size={20} className="text-accent" />
          <h3 className="font-semibold text-white/90">新增換匯紀錄</h3>
        </div>
        {records.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors cursor-pointer"
          >
            <History size={14} />
            {showHistory ? '隱藏' : '查看'}歷史紀錄（{records.length}）
          </button>
        )}
      </div>

      {/* 表單 */}
      <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {/* 日期 */}
        <div>
          <label className="text-[11px] text-white/40 tracking-wider block mb-1">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* 幣別 */}
        <div>
          <label className="text-[11px] text-white/40 tracking-wider block mb-1">幣別</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent/50"
          >
            <option value="USD">美元 USD</option>
            <option value="EUR">歐元 EUR</option>
          </select>
        </div>

        {/* 金額 */}
        <div>
          <label className="text-[11px] text-white/40 tracking-wider block mb-1">金額</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="10,000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* 匯率 */}
        <div>
          <label className="text-[11px] text-white/40 tracking-wider block mb-1">
            匯率
            <button
              type="button"
              onClick={prefillRate}
              className="ml-1.5 text-accent/60 hover:text-accent text-[10px] cursor-pointer"
            >
              [帶入今日]
            </button>
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            placeholder="31.5250"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent/50"
          />
        </div>

        {/* 送出 */}
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent text-sm font-medium rounded-lg px-4 py-2 transition-colors cursor-pointer"
          >
            + 新增
          </button>
        </div>
      </form>

      {/* 預覽 */}
      {amount && rate && (
        <div className="bg-white/[0.03] rounded-lg px-4 py-2.5 mb-4 text-xs text-white/50">
          買入 <span className="text-white/80 font-medium">{currency} {parseFloat(amount).toLocaleString()}</span>，匯率{' '}
          <span className="text-white/80 font-medium">{parseFloat(rate).toFixed(4)}</span>，合計{' '}
          <span className="text-white font-semibold">NT$ {(parseFloat(amount) * parseFloat(rate)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </div>
      )}

      {/* 歷史紀錄表格 */}
      {showHistory && filteredRecords.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/30 tracking-wider border-b border-white/5">
                <th className="text-left py-2 font-medium">日期</th>
                <th className="text-left py-2 font-medium">幣別</th>
                <th className="text-right py-2 font-medium">金額</th>
                <th className="text-right py-2 font-medium">匯率</th>
                <th className="text-right py-2 font-medium">台幣成本</th>
                <th className="text-right py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
                <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2 text-white/60">{r.date}</td>
                  <td className="py-2 text-white/60">{r.currency}</td>
                  <td className="py-2 text-right text-white/80 font-medium">
                    {r.amountForeign.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 text-right text-white/60">{r.rate.toFixed(4)}</td>
                  <td className="py-2 text-right text-white/80">
                    {r.twdSpent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => onDelete(r.id)}
                      className="text-white/20 hover:text-danger transition-colors cursor-pointer p-1"
                      title="刪除紀錄"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
