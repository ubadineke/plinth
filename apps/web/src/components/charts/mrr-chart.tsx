'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatKobo } from '@/lib/utils';

/* Chart colors are hex on purpose — SVG presentation attributes don't resolve
   CSS vars reliably. Keep in sync with DESIGN.md. */
const JADE = '#0fa37f';
const GRID = '#e9e9e5';
const TICK = '#a3a39e';

function MrrTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-ink px-3 py-2 pop-shadow">
      <p className="label-mono text-[10px] text-faint">{label}</p>
      <p className="font-mono text-[13px] font-semibold text-canvas">
        {formatKobo(payload[0].value)}
      </p>
    </div>
  );
}

export function MrrChart({ data }: { data: { month: string; mrr: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={JADE} stopOpacity={0.22} />
            <stop offset="100%" stopColor={JADE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: TICK, fontFamily: '"JetBrains Mono", monospace' }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tickFormatter={(v: number) => `₦${Math.round(v / 100000)}k`}
          tick={{ fontSize: 11, fill: TICK, fontFamily: '"JetBrains Mono", monospace' }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<MrrTooltip />} cursor={{ stroke: GRID }} />
        <Area
          type="monotone"
          dataKey="mrr"
          stroke={JADE}
          strokeWidth={2}
          fill="url(#mrrFill)"
          dot={false}
          activeDot={{ r: 3.5, fill: JADE, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
