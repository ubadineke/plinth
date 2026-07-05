import { cn } from '@/lib/utils';

/**
 * Status chips — 10.5px mono uppercase, tinted fill + strong text (DESIGN.md).
 * jade = money-good · warn = at-risk · danger = broken · info = in-flight · neutral = inert
 */
const tones = {
  jade: 'bg-jade-tint text-jade-deep dark:text-jade-lite',
  warn: 'bg-warn-tint text-warn',
  danger: 'bg-danger-tint text-danger',
  info: 'bg-info-tint text-info',
  neutral: 'bg-soft text-mid',
};

const stateTone: Record<string, keyof typeof tones> = {
  // money-good
  active: 'jade',
  paid: 'jade',
  live: 'jade',
  delivered: 'jade',
  recovered: 'jade',
  succeeded: 'jade',
  sent: 'jade',
  approved: 'jade',
  // at-risk / waiting on money
  past_due: 'warn',
  grace: 'warn',
  partially_paid: 'warn',
  partial: 'warn',
  pending: 'warn',
  retrying: 'warn',
  test: 'warn',
  // broken
  delinquent: 'danger',
  suspense: 'danger',
  failed: 'danger',
  uncollectible: 'danger',
  rejected: 'danger',
  // in-flight
  trialing: 'info',
  open: 'info',
  transfer: 'info',
  // inert
  incomplete: 'neutral',
  canceled: 'neutral',
  paused: 'neutral',
  void: 'neutral',
  card: 'neutral',
};

interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function Badge({ status, label, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-[3px] font-mono text-[10.5px] font-medium uppercase tracking-[0.05em]',
        tones[stateTone[status] ?? 'neutral'],
        className,
      )}
    >
      {label ?? status.replace(/_/g, ' ')}
    </span>
  );
}
