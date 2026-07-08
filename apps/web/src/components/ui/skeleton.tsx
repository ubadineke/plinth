import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-line/60', className)} />
  );
}

export function TableSkeleton({ cols = 5, rows = 6 }: { cols?: number; rows?: number }) {
  const widths = ['w-1/3', 'w-1/2', 'w-2/5', 'w-1/4', 'w-3/5'];
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-line/60 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <Skeleton className={cn('h-3.5', widths[(r + c) % widths.length])} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-1/3' : i % 3 === 0 ? 'w-2/3' : 'w-1/2')} />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 space-y-3">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-7 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  );
}
