'use client';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

/** Tiny on-dark sparkline for the hero panel. */
export function Spark({ data }: { data: { month: string; mrr: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3bc0a1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3bc0a1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="mrr"
          stroke="#3bc0a1"
          strokeWidth={1.75}
          fill="url(#sparkFill)"
          dot={false}
          isAnimationActive
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
