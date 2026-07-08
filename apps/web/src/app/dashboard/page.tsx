'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowUpRight } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountUp } from '@/components/ui/count-up';
import { Stagger, Rise } from '@/components/ui/motion';
import { MrrChart } from '@/components/charts/mrr-chart';
import { Spark } from '@/components/charts/spark';
import { SubMix } from '@/components/charts/sub-mix';
import { MOCK_MRR_TREND } from '@/lib/mock-data';
import { formatKobo, formatRelativeDate, cn } from '@/lib/utils';
import { useSubscriptions } from '@/lib/queries/subscriptions';
import { usePlans, type Plan } from '@/lib/queries/plans';
import { useInvoices, type Invoice } from '@/lib/queries/invoices';
import { useCustomers } from '@/lib/queries/customers';
import type { Subscription, Customer } from '@/lib/types';
import { QuickstartCard, isQuickstartDismissed } from '@/components/onboarding/quickstart-card';

/* ── main overview ──────────────────────────────────────────────────────── */

interface AttentionItem {
  id: string;
  customer: string;
  plan: string;
  amount: number;
  state: string;
}

interface Snapshot {
  mrr: number;
  counts: Record<string, number>;
  totalSubs: number;
  collected: number;
  plinthFee: number;
  atRisk: number;
  attention: AttentionItem[];
  invoices: Invoice[];
  customerNames: Map<string, string>;
}

const SEVERITY: Record<string, number> = { delinquent: 0, past_due: 1, grace: 2 };

function computeSnapshot(subs: Subscription[], plans: Plan[], invoices: Invoice[], customers: Customer[]): Snapshot {
  const planById = new Map(plans.map((p) => [p.id, p]));
  const customerNames = new Map<string, string>(customers.map((c) => [c.id, c.name]));

  const counts: Record<string, number> = {};
  for (const s of subs) counts[s.state] = (counts[s.state] ?? 0) + 1;

  const amountOf = (s: Subscription) => Number(planById.get(s.plan_id)?.amount_minor ?? 0) * (s.quantity ?? 1);

  const mrr = subs
    .filter((s) => s.state === 'active' || s.state === 'trialing')
    .reduce((sum, s) => sum + amountOf(s), 0);

  const risky = subs.filter((s) => s.state in SEVERITY);
  const atRisk = risky.reduce((sum, s) => sum + amountOf(s), 0);

  const attention = risky
    .slice()
    .sort((a, b) => SEVERITY[a.state] - SEVERITY[b.state])
    .map((s) => ({
      id: s.id,
      customer: customerNames.get(s.customer_id) ?? s.customer_id,
      plan: planById.get(s.plan_id)?.name ?? '—',
      amount: amountOf(s),
      state: s.state,
    }));

  const collected = invoices
    .filter((inv) => inv.state === 'paid')
    .reduce((sum, inv) => sum + Number(inv.amount_paid ?? 0), 0);

  return {
    mrr,
    counts,
    totalSubs: subs.length,
    collected,
    plinthFee: Math.round(collected * 0.005),
    atRisk,
    attention,
    invoices: invoices.slice(0, 5),
    customerNames,
  };
}

function HeroStat({ label, value, tone }: { label: string; value: string; tone?: 'jade' | 'warn' }) {
  return (
    <div>
      <p className="label-mono text-[10px] text-hero-mut">{label}</p>
      <p
        className={cn(
          'mt-1 font-mono text-[17px] font-semibold tracking-tight',
          tone === 'jade' ? 'text-jade-lite' : tone === 'warn' ? 'text-[#f2b705]' : 'text-hero-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function BandStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="label-mono text-mid">{label}</p>
      <p className="mt-1.5 font-mono text-[22px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-mid">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [showQuickstart, setShowQuickstart] = useState(false);

  useEffect(() => {
    setShowQuickstart(!isQuickstartDismissed());
  }, []);

  const subscriptionsQuery = useSubscriptions();
  const plansQuery = usePlans();
  const invoicesQuery = useInvoices();
  const customersQuery = useCustomers();

  // Mirrors the original's Promise.allSettled: each dataset independently
  // defaults to [] if its fetch failed, rather than blocking the snapshot.
  const subs = subscriptionsQuery.data?.data ?? [];
  const plans = plansQuery.data?.data ?? [];
  const invoices = invoicesQuery.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];

  const isLoading =
    subscriptionsQuery.isPending || plansQuery.isPending || invoicesQuery.isPending || customersQuery.isPending;

  const snap = useMemo(
    () => (isLoading ? null : computeSnapshot(subs, plans, invoices, customers)),
    [isLoading, subs, plans, invoices, customers],
  );

  // Scale the demo trend so it lands exactly on live MRR — one consistent story.
  const trend = useMemo(() => {
    if (!snap || snap.mrr === 0) return MOCK_MRR_TREND;
    const factor = snap.mrr / MOCK_MRR_TREND[MOCK_MRR_TREND.length - 1].mrr;
    return MOCK_MRR_TREND.map((p) => ({ ...p, mrr: Math.round(p.mrr * factor) }));
  }, [snap]);

  const deltaPct = useMemo(() => {
    const a = trend[trend.length - 2]?.mrr ?? 0;
    const b = trend[trend.length - 1]?.mrr ?? 0;
    return a > 0 ? ((b - a) / a) * 100 : 0;
  }, [trend]);

  const monthLabel = new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric' }).format(
    new Date(),
  );

  return (
    <div className="flex flex-col">
      <Topbar title="Overview" subtitle={monthLabel} />

      {showQuickstart && (
        <div className="p-6 pb-0">
          <QuickstartCard onDismiss={() => setShowQuickstart(false)} />
        </div>
      )}

      {!snap ? (
        /* skeleton — same bones, soft pulse */
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 h-[188px] animate-pulse rounded-2xl bg-soft lg:col-span-8" />
            <div className="col-span-12 h-[188px] animate-pulse rounded-xl bg-soft lg:col-span-4" />
          </div>
          <div className="h-[88px] animate-pulse rounded-xl bg-soft" />
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 h-[280px] animate-pulse rounded-xl bg-soft lg:col-span-8" />
            <div className="col-span-12 h-[280px] animate-pulse rounded-xl bg-soft lg:col-span-4" />
          </div>
        </div>
      ) : (
        <Stagger className="space-y-4 p-6">
          {/* Row 1 — hero + needs attention */}
          <div className="grid grid-cols-12 gap-4">
            <Rise className="col-span-12 lg:col-span-8">
              <div
                data-tour="mrr-panel"
                className="hero-panel relative flex h-full flex-col overflow-hidden rounded-2xl p-6 pb-0"
              >
                <div className="flex items-start justify-between">
                  <p className="label-mono text-hero-mut">Monthly recurring revenue</p>
                  <span className="rounded-full border border-white/10 px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.05em] text-hero-mut">
                    {monthLabel}
                  </span>
                </div>
                <div className="mt-3 flex flex-1 items-start justify-between gap-6">
                  <div>
                    <CountUp
                      value={snap.mrr}
                      format={(v) => formatKobo(Math.round(v))}
                      className="font-display text-[42px] font-semibold leading-none tracking-tight text-hero-ink"
                    />
                    <p className="mt-2.5 flex items-center gap-2 text-[12.5px]">
                      <span className="flex items-center gap-0.5 font-mono font-medium text-jade-lite">
                        <ArrowUpRight size={13} />
                        {deltaPct.toFixed(1)}%
                      </span>
                      <span className="text-hero-mut">
                        vs last month · {snap.counts['active'] ?? 0} active subscription
                        {(snap.counts['active'] ?? 0) === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                  <div className="hidden shrink-0 grid-cols-1 gap-3.5 border-l border-white/10 pl-6 pr-2 sm:grid">
                    <HeroStat label="Collected" value={formatKobo(snap.collected)} />
                    <HeroStat label="Plinth fee · 0.5%" value={formatKobo(snap.plinthFee)} tone="jade" />
                    <HeroStat label="At risk" value={formatKobo(snap.atRisk)} tone="warn" />
                  </div>
                </div>
                <div className="-mx-6 mt-2">
                  <Spark data={trend} />
                </div>
              </div>
            </Rise>

            <Rise className="col-span-12 lg:col-span-4">
              <Card data-tour="attention-card" className="flex h-full flex-col">
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CardTitle>Needs attention</CardTitle>
                  {snap.attention.length > 0 && (
                    <span className="rounded-full bg-danger-tint px-2 py-[2px] font-mono text-[11px] font-semibold text-danger">
                      {snap.attention.length}
                    </span>
                  )}
                </CardHeader>
                {snap.attention.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
                    <CheckCircle size={20} className="text-jade" />
                    <p className="text-[13px] text-mid">All caught up — nothing at risk.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 divide-y divide-line/70">
                      {snap.attention.slice(0, 4).map((item) => (
                        <Link
                          key={item.id}
                          href="/dashboard/dunning"
                          className="flex items-center gap-3 px-5 py-2.5 transition-colors duration-150 hover:bg-soft/60"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-medium text-ink">
                              {item.customer}
                            </p>
                            <p className="mt-px font-mono text-[11px] text-faint">
                              {item.plan} · {formatKobo(item.amount)}
                            </p>
                          </div>
                          <Badge status={item.state} />
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/dashboard/dunning"
                      className="border-t border-line px-5 py-2.5 text-[12.5px] font-medium text-jade-deep transition-colors duration-150 hover:bg-soft/60"
                    >
                      Open dunning board →
                    </Link>
                  </>
                )}
              </Card>
            </Rise>
          </div>

          {/* Row 2 — stat band */}
          <Rise>
            <Card className="grid grid-cols-2 divide-x divide-y divide-line lg:grid-cols-4 lg:divide-y-0">
              <BandStat
                label="Active"
                value={snap.counts['active'] ?? 0}
                sub={`of ${snap.totalSubs} subscriptions`}
              />
              <BandStat label="Trialing" value={snap.counts['trialing'] ?? 0} sub="converting soon" />
              <BandStat
                label="Past due"
                value={(snap.counts['past_due'] ?? 0) + (snap.counts['grace'] ?? 0)}
                sub={`${formatKobo(snap.atRisk)} at risk`}
              />
              <BandStat
                label="Delinquent"
                value={snap.counts['delinquent'] ?? 0}
                sub="on hold for non-payment"
              />
            </Card>
          </Rise>

          {/* Row 3 — charts */}
          <div className="grid grid-cols-12 gap-4">
            <Rise className="col-span-12 lg:col-span-8">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-baseline justify-between py-3">
                  <CardTitle>MRR trend</CardTitle>
                  <span className="font-mono text-[11px] text-faint">last 6 months</span>
                </CardHeader>
                <CardContent className="pt-3">
                  <MrrChart data={trend} />
                </CardContent>
              </Card>
            </Rise>
            <Rise className="col-span-12 lg:col-span-4">
              <Card className="h-full">
                <CardHeader className="py-3">
                  <CardTitle>Subscription mix</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <SubMix counts={snap.counts} />
                </CardContent>
              </Card>
            </Rise>
          </div>

          {/* Row 4 — recent invoices */}
          <Rise>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle>Recent invoices</CardTitle>
                <Link
                  href="/dashboard/invoices"
                  className="text-[12.5px] font-medium text-jade-deep hover:underline"
                >
                  View all →
                </Link>
              </CardHeader>
              <div className="divide-y divide-line/70">
                {snap.invoices.length === 0 ? (
                  <p className="px-5 py-8 text-center text-[13px] text-faint">No invoices yet</p>
                ) : (
                  snap.invoices.map((inv) => (
                    <Link
                      key={inv.id}
                      href="/dashboard/invoices"
                      className="flex items-center gap-4 px-5 py-2.5 transition-colors duration-150 hover:bg-soft/60"
                    >
                      <span className="w-20 truncate font-mono text-xs text-mid">{inv.id}</span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-body">
                        {snap.customerNames.get(inv.customer_id) ?? inv.customer_id ?? '—'}
                      </span>
                      <Badge status={inv.state} />
                      <span className="w-24 text-right font-mono text-[13px] font-medium text-ink">
                        {formatKobo(Number(inv.amount_due))}
                      </span>
                      <span className="w-20 text-right font-mono text-[11px] text-faint">
                        {inv.created_at ? formatRelativeDate(inv.created_at) : '—'}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </Rise>
        </Stagger>
      )}
    </div>
  );
}
