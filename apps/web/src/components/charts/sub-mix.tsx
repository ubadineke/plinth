'use client';
import { cn } from '@/lib/utils';

/** Denser than a donut: segmented bar + legend rows with counts (DESIGN.md). */
const STATE_META: { state: string; label: string; color: string }[] = [
  { state: 'active', label: 'Active', color: '#0fa37f' },
  { state: 'trialing', label: 'Trialing', color: '#2563eb' },
  { state: 'past_due', label: 'Past due', color: '#d97706' },
  { state: 'grace', label: 'Grace', color: '#f2b705' },
  { state: 'delinquent', label: 'Delinquent', color: '#e5484d' },
  { state: 'incomplete', label: 'Incomplete', color: '#a3a39e' },
  { state: 'canceled', label: 'Canceled', color: '#d6d6d1' },
];

export function SubMix({ counts, className }: { counts: Record<string, number>; className?: string }) {
  const rows = STATE_META.map((m) => ({ ...m, count: counts[m.state] ?? 0 })).filter(
    (r) => r.count > 0,
  );
  const total = rows.reduce((s, r) => s + r.count, 0);

  if (total === 0) {
    return <p className="py-8 text-center text-[13px] text-faint">No subscriptions yet</p>;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-soft">
        {rows.map((r) => (
          <div
            key={r.state}
            className="h-full transition-[width] duration-700 ease-brand"
            style={{ width: `${(r.count / total) * 100}%`, backgroundColor: r.color }}
            title={`${r.label}: ${r.count}`}
          />
        ))}
      </div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.state} className="flex items-center gap-2.5 rounded-md px-1.5 py-[5px] transition-colors duration-150 hover:bg-soft/60">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="flex-1 text-[13px] text-body">{r.label}</span>
            <span className="font-mono text-[12.5px] font-medium text-ink">{r.count}</span>
            <span className="w-10 text-right font-mono text-[11px] text-faint">
              {Math.round((r.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
