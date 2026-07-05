import { Card } from './card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; positive: boolean };
  icon?: React.ReactNode;
  tooltip?: string;
}

export function StatCard({ label, value, sub, trend, icon, tooltip }: StatCardProps) {
  return (
    <Card className="px-4 py-3.5" title={tooltip}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="label-mono text-mid">{label}</p>
          <p className="mt-1.5 font-mono text-[22px] font-semibold leading-none tracking-tight text-ink">
            {value}
          </p>
          {sub && <p className="mt-1.5 text-xs text-mid">{sub}</p>}
          {trend && (
            <p
              className={cn(
                'mt-1.5 font-mono text-[11px] font-medium',
                trend.positive ? 'text-jade-deep' : 'text-danger',
              )}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && <div className="shrink-0 text-faint">{icon}</div>}
      </div>
    </Card>
  );
}
