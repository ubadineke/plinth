'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatKobo, formatDate, cn } from '@/lib/utils';
import { Bell, Check, X } from 'lucide-react';

interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  state: string;
  quantity: number;
  preferred_rail: string;
  metadata: Record<string, unknown>;
}
interface Customer { id: string; name: string }
interface Plan { id: string; name: string; amount_minor: string }
interface Notification { id: string; customer_id: string; event_type: string | null; created_at: string }
interface ListResponse<T> { object: 'list'; data: T[] }

type ReminderState = 'idle' | 'sending' | 'sent' | 'failed';

function str(meta: Record<string, unknown>, key: string): string | null {
  const v = meta?.[key];
  return typeof v === 'string' ? v : null;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

function GraceDaysBar({ daysRemaining, graceDays }: { daysRemaining: number; graceDays: number }) {
  const used = graceDays - daysRemaining;
  const pct = Math.min(Math.max((used / Math.max(graceDays, 1)) * 100, 0), 100);
  const color = daysRemaining <= 2 ? 'bg-danger-bar' : daysRemaining <= Math.ceil(graceDays / 2) ? 'bg-warn-bar' : 'bg-faint';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-mid mb-1">
        <span>Grace period</span>
        <span className={cn('font-mono', daysRemaining <= 2 ? 'text-danger font-medium' : daysRemaining <= Math.ceil(graceDays / 2) ? 'text-warn' : '')}>
          {Math.max(daysRemaining, 0)}d remaining
        </span>
      </div>
      <div className="h-1.5 bg-soft rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500 ease-brand', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DunningPage() {
  // Shared SWR keys — subscriptions/customers/plans reuse cache from other pages
  const { data: subsData, isLoading: subsLoading } = useSWR('subscriptions', () => api.subscriptions.list() as Promise<ListResponse<Subscription>>);
  const { data: custData } = useSWR('customers', () => api.customers.list() as Promise<ListResponse<Customer>>);
  const { data: planData } = useSWR('plans', () => api.plans.list() as Promise<ListResponse<Plan>>);
  const { data: notifData } = useSWR('notifications', () => (api.notifications.list() as Promise<ListResponse<Notification>>).catch(() => ({ data: [] as Notification[] })));
  const { data: policyData } = useSWR('policy', () => (api.policy.get() as Promise<{ grace_days?: number }>).catch(() => null));
  const { data: clockData } = useSWR('clock', () => (api.clock.get() as Promise<{ simulated_now: string | null }>).catch(() => null));

  const loading = subsLoading;
  const subs: Subscription[] = subsData?.data ?? [];
  const names: Record<string, string> = Object.fromEntries((custData?.data ?? []).map((c) => [c.id, c.name]));
  const plans: Record<string, Plan> = Object.fromEntries((planData?.data ?? []).map((p) => [p.id, p]));
  const recovered: Notification[] = (notifData?.data ?? []).filter((n) => n.event_type === 'recovered').slice(0, 10);
  const graceDays: number = policyData?.grace_days ?? 7;
  const now: Date = clockData?.simulated_now ? new Date(clockData.simulated_now) : new Date();

  const [reminders, setReminders] = useState<Record<string, ReminderState>>({});

  async function sendReminder(customerId: string) {
    setReminders((r) => ({ ...r, [customerId]: 'sending' }));
    try {
      const res: any = await api.notifications.remind(customerId);
      setReminders((r) => ({ ...r, [customerId]: res.ok ? 'sent' : 'failed' }));
    } catch {
      setReminders((r) => ({ ...r, [customerId]: 'failed' }));
    }
  }

  const amountOf = (s: Subscription): number => {
    const p = plans[s.plan_id];
    return p ? Number(p.amount_minor) * (s.quantity ?? 1) : 0;
  };
  const planName = (s: Subscription): string => plans[s.plan_id]?.name ?? s.plan_id;

  const pastDue = subs.filter((s) => s.state === 'past_due');
  const grace = subs.filter((s) => s.state === 'grace');
  const delinquent = subs.filter((s) => s.state === 'delinquent');

  const totalAtRisk = [...pastDue, ...grace, ...delinquent].reduce((sum, s) => sum + amountOf(s), 0);

  function ReminderButton({ customerId }: { customerId: string }) {
    const state = reminders[customerId] ?? 'idle';
    return (
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full text-xs"
        disabled={state === 'sending'}
        onClick={() => sendReminder(customerId)}
        title="Send this customer a payment reminder by SMS + email"
      >
        {state === 'sending' ? 'Sending…'
          : state === 'sent' ? <><Check size={12} /> Reminder sent</>
          : state === 'failed' ? <><X size={12} /> Failed — retry</>
          : <><Bell size={12} /> Send reminder</>}
      </Button>
    );
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Dunning" subtitle="Recovery board" />

      <div className="p-6 space-y-6">
        {/* Metrics strip */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-danger-tint border border-danger/15 rounded-lg">
            <span className="text-sm font-mono font-semibold text-danger">{formatKobo(totalAtRisk)}</span>
            <span className="text-xs text-danger">at risk in dunning</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-jade-tint border border-jade/15 rounded-lg">
            <span className="text-sm font-mono font-semibold text-jade-deep">{recovered.length}</span>
            <span className="text-xs text-jade-deep">recovered recently</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-line bg-card p-4 space-y-3">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-5 w-1/4" />
                {[0, 1].map((j) => (
                  <div key={j} className="rounded-xl border border-line p-3 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-7 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* Past Due */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-warn-bar" />
              <h3 className="label-mono text-warn">Past Due ({pastDue.length})</h3>
            </div>
            <div className="space-y-3">
              {pastDue.length === 0 && <p className="text-xs text-faint">Nothing past due</p>}
              {pastDue.map((s, i) => {
                const decline = str(s.metadata, 'declineCode');
                const nextRetry = str(s.metadata, 'dunningNextRetryAt');
                return (
                  <Card key={s.id} className="p-4 animate-row-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <p className="text-sm font-medium text-ink">{names[s.customer_id] ?? s.customer_id}</p>
                    <p className="text-xs text-mid">{planName(s)} · <span className="font-mono">{formatKobo(amountOf(s))}</span></p>
                    {decline && (
                      <div className="mt-2">
                        <span className="label-mono px-2 py-0.5 rounded-full bg-danger-tint text-danger">{decline}</span>
                      </div>
                    )}
                    {nextRetry && (
                      <p className="text-xs text-mid mt-1">Retries in {Math.max(daysBetween(now, new Date(nextRetry)), 0)}d</p>
                    )}
                    <ReminderButton customerId={s.customer_id} />
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Grace Period */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-warn-bar" />
              <h3 className="label-mono text-warn">Grace Period ({grace.length})</h3>
            </div>
            <div className="space-y-3">
              {grace.length === 0 && <p className="text-xs text-faint">Nobody in grace</p>}
              {grace.map((s, i) => {
                const enteredGrace = str(s.metadata, 'enteredGraceAt');
                const daysRemaining = enteredGrace ? graceDays - daysBetween(new Date(enteredGrace), now) : graceDays;
                return (
                  <Card key={s.id} className="p-4 animate-row-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <p className="text-sm font-medium text-ink">{names[s.customer_id] ?? s.customer_id}</p>
                    <p className="text-xs text-mid">{planName(s)} · <span className="font-mono">{formatKobo(amountOf(s))}</span></p>
                    {enteredGrace && <p className="text-xs text-mid mt-1">Entered grace {formatDate(enteredGrace)}</p>}
                    <GraceDaysBar daysRemaining={daysRemaining} graceDays={graceDays} />
                    <ReminderButton customerId={s.customer_id} />
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Delinquent */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-danger-bar" />
              <h3 className="label-mono text-danger">Delinquent ({delinquent.length})</h3>
            </div>
            <div className="space-y-3">
              {delinquent.length === 0 && <p className="text-xs text-faint">Nobody delinquent</p>}
              {delinquent.map((s, i) => {
                const since = str(s.metadata, 'enteredDelinquentAt');
                return (
                  <Card key={s.id} className="p-4 border-danger/25 animate-row-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <p className="text-sm font-medium text-ink">{names[s.customer_id] ?? s.customer_id}</p>
                    <p className="text-xs text-mid mb-2">{planName(s)}</p>
                    <p className="text-base font-mono font-semibold text-danger">{formatKobo(amountOf(s))} owed</p>
                    {since && <p className="text-xs text-faint mt-1">Since {formatDate(since)}</p>}
                    <ReminderButton customerId={s.customer_id} />
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recovered */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-jade" />
              <h3 className="label-mono text-jade-deep">Recovered ({recovered.length})</h3>
            </div>
            <div className="space-y-3">
              {recovered.length === 0 && <p className="text-xs text-faint">No recent recoveries</p>}
              {recovered.map((n, i) => (
                <Card key={n.id} className="p-4 border-jade/20 animate-row-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <p className="text-sm font-medium text-ink">{names[n.customer_id] ?? n.customer_id}</p>
                  <p className="text-xs text-jade-deep mt-1">Payment recovered</p>
                  <p className="text-xs text-faint mt-1">{formatDate(n.created_at)}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
