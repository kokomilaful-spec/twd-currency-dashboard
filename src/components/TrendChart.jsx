import { useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const MA_CONFIG = [
  { key: 'ma5',  color: '#facc15', label: 'MA5' },
  { key: 'ma10', color: '#fb923c', label: 'MA10' },
  { key: 'ma20', color: '#f87171', label: 'MA20' },
];

const CustomTooltip = ({ active, payload, label, visibleMAs }) => {
  if (!active || !payload?.length) return null;
  const spot = payload.find((p) => p.dataKey === 'spotSell');
  return (
    <div className="glass px-3 py-2 text-xs space-y-1 min-w-[100px]">
      <p className="text-white/50 mb-1">{label}</p>
      {spot && (
        <p className="text-white font-semibold">即期 {spot.value?.toFixed(4)}</p>
      )}
      {MA_CONFIG.filter((m) => visibleMAs.has(m.key)).map((m) => {
        const entry = payload.find((p) => p.dataKey === m.key);
        if (!entry?.value) return null;
        return (
          <p key={m.key} style={{ color: m.color }}>
            {m.label} {entry.value.toFixed(4)}
          </p>
        );
      })}
    </div>
  );
};

export default function TrendChart({ data, avg, pair }) {
  const [visibleMAs, setVisibleMAs] = useState(new Set(['ma5', 'ma20']));
  const isUsd = pair.startsWith('USD');
  const color = isUsd ? '#6366f1' : '#8b5cf6';

  const toggleMA = (key) => {
    setVisibleMAs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="glass glow-accent p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white/90">{pair} — 30 日走勢</h3>
        <span className="text-xs text-white/40">
          均價：<span className="text-white/60 font-medium">{avg.toFixed(4)}</span>
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {MA_CONFIG.map((m) => (
          <button
            key={m.key}
            onClick={() => toggleMA(m.key)}
            className="text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer"
            style={{
              borderColor: m.color + '60',
              color: m.color,
              backgroundColor: visibleMAs.has(m.key) ? m.color + '18' : 'transparent',
              opacity: visibleMAs.has(m.key) ? 1 : 0.35,
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${pair}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['dataMin - 0.1', 'dataMax + 0.1']}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip visibleMAs={visibleMAs} />} />
          <ReferenceLine
            y={avg}
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="6 4"
            label={{
              value: '30日均',
              position: 'right',
              fill: 'rgba(255,255,255,0.22)',
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="spotSell"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${pair})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          {MA_CONFIG.map((m) =>
            visibleMAs.has(m.key) ? (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                stroke={m.color}
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                connectNulls={false}
              />
            ) : null
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
