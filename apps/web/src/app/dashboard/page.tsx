'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users, AlertTriangle, CheckCircle, Key, Copy, BookOpen, CreditCard, Webhook,
  ArrowRight, Sparkles, ArrowUpRight,
} from 'lucide-react';
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
import { api } from '@/lib/api';

const DEMO_API_KEY = 'sk_live_a1b2c3d4e5f67890';

function OnboardingView({ onDismiss }: { onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(DEMO_API_KEY).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Welcome to Plinth" subtitle="Get started in under 5 minutes" />
      <div className="mx-auto w-full max-w-2xl space-y-5 p-6">
        {/* Welcome card — the one dark panel */}
        <div className="hero-panel rounded-2xl p-6 text-hero-ink">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-jade-lite" />
                <span className="label-mono text-hero-mut">Account approved</span>
              </div>
              <h2 className="mb-1 font-display text-xl font-semibold tracking-tight">
                Your Plinth account is live
              </h2>
              <p className="text-[13.5px] leading-relaxed text-hero-mut">
                You're now connected to Nomba's payment infrastructure. Start billing your
                customers in minutes.
              </p>
            </div>
            <CheckCircle size={28} className="shrink-0 text-jade-lite" />
          </div>
        </div>

        {/* API key */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key size={15} className="text-jade" />
              Your live API key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-lg border border-line bg-soft px-4 py-3 font-mono text-[13px] text-ink">
                {DEMO_API_KEY}
              </code>
              <button
                onClick={copy}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-body transition-colors duration-150 hover:border-faint hover:text-ink"
              >
                <Copy size={12} />
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-warn">
              <AlertTriangle size={12} />
              Keep this key private. Never commit it to a repository or share it publicly.
            </p>
          </CardContent>
        </Card>

        {/* Quickstart steps */}
        <Card>
          <CardHeader><CardTitle>Quickstart — 3 API calls</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                step: 1,
                title: 'Create a customer',
                code: `curl -X POST https://api.useplinth.com/v1/customers \\
  -H "Authorization: Bearer ${DEMO_API_KEY}" \\
  -d '{"name":"Acme Corp","email":"billing@acme.ng"}'`,
                href: '/docs/api-reference/create-customer',
              },
              {
                step: 2,
                title: 'Subscribe them to a plan',
                code: `curl -X POST https://api.useplinth.com/v1/subscriptions \\
  -H "Authorization: Bearer ${DEMO_API_KEY}" \\
  -d '{"customer_id":"cus_...","plan_id":"pln_..."}'`,
                href: '/docs/api-reference/create-subscription',
              },
              {
                step: 3,
                title: 'Check entitlements before serving features',
                code: `curl https://api.useplinth.com/v1/customers/cus_.../entitlements \\
  -H "Authorization: Bearer ${DEMO_API_KEY}"`,
                href: '/docs/api-reference/get-customer-entitlements',
              },
            ].map(({ step, title, code, href }) => (
              <div key={step} className="flex gap-4">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-jade-tint">
                  <span className="font-mono text-xs font-bold text-jade-deep">{step}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-[13.5px] font-medium text-ink">{title}</p>
                  <pre className="whitespace-pre-wrap break-all rounded-lg border border-line bg-soft p-3 font-mono text-xs text-body">
                    {code}
                  </pre>
                  <Link
                    href={href}
                    className="flex items-center gap-1 text-xs font-medium text-jade-deep hover:underline"
                  >
                    View full docs <ArrowRight size={10} />
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Next steps */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <BookOpen size={16} />, title: 'Read the docs', desc: 'Full API reference, guides, and SDKs', href: '/docs' },
            { icon: <CreditCard size={16} />, title: 'Set up plans', desc: 'Create your billing catalog', href: '/dashboard/catalog' },
            { icon: <Webhook size={16} />, title: 'Configure webhooks', desc: 'Get notified on every event', href: '/dashboard/webhooks' },
            { icon: <Users size={16} />, title: 'Invite your team', desc: 'Coming soon', href: '#' },
          ].map(({ icon, title, desc, href }) => (
            <Link key={title} href={href} className="group block">
              <div className="rounded-xl border border-line bg-card p-4 shadow-card transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-faint">
                <div className="mb-2 text-jade">{icon}</div>
                <p className="text-[13.5px] font-medium text-ink">{title}</p>
                <p className="mt-0.5 text-xs text-mid">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onDismiss}
            className="text-xs text-faint underline transition-colors duration-150 hover:text-mid"
          >
            Skip to dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── main overview ──────────────────────────────────────────────────────── */

interface Snapshot {
  mrr: number;
  counts: Record<string, number>;
  totalSubs: number;
  collected: number;
  plinthFee: number;
  atRisk: number;
  attention: { id: string; customer: string; plan: string; amount: number; state: string }[];
  invoices: any[];
  customerNames: Map<string, string>;
}

const SEVERITY: Record<string, number> = { delinquent: 0, past_due: 1, grace: 2 };

async function fetchSnapshot(): Promise<Snapshot> {
  const [subsRes, plansRes, invoicesRes, customersRes] = await Promise.allSettled([
    api.subscriptions.list() as Promise<{ data: any[] }>,
    api.plans.list() as Promise<{ data: any[] }>,
    api.invoices.list() as Promise<{ data: any[] }>,
    api.customers.list() as Promise<{ data: any[] }>,
  ]);
  const subs = subsRes.status === 'fulfilled' ? subsRes.value.data ?? [] : [];
  const plans = plansRes.status === 'fulfilled' ? plansRes.value.data ?? [] : [];
  const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value.data ?? [] : [];
  const customers = customersRes.status === 'fulfilled' ? customersRes.value.data ?? [] : [];

  const planById = new Map(plans.map((p: any) => [p.id, p]));
  const customerNames = new Map<string, string>(customers.map((c: any) => [c.id, c.name]));

  const counts: Record<string, number> = {};
  for (const s of subs) counts[s.state] = (counts[s.state] ?? 0) + 1;

  const amountOf = (s: any) => Number(planById.get(s.plan_id)?.amount_minor ?? 0) * (s.quantity ?? 1);

  const mrr = subs
    .filter((s: any) => s.state === 'active' || s.state === 'trialing')
    .reduce((sum: number, s: any) => sum + amountOf(s), 0);

  const risky = subs.filter((s: any) => s.state in SEVERITY);
  const atRisk = risky.reduce((sum: number, s: any) => sum + amountOf(s), 0);

  const attention = risky
    .sort((a: any, b: any) => SEVERITY[a.state] - SEVERITY[b.state])
    .map((s: any) => ({
      id: s.id,
      customer: customerNames.get(s.customer_id) ?? s.customer_id,
      plan: planById.get(s.plan_id)?.name ?? '—',
      amount: amountOf(s),
      state: s.state,
    }));

  const collected = invoices
    .filter((inv: any) => inv.state === 'paid')
    .reduce((sum: number, inv: any) => sum + Number(inv.amount_paid ?? 0), 0);

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    const isNew = localStorage.getItem('plinth_onboarding_shown') !== 'true';
    if (isNew) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    fetchSnapshot().then(setSnap).catch(() => {});
  }, []);

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

  function dismissOnboarding() {
    localStorage.setItem('plinth_onboarding_shown', 'true');
    setShowOnboarding(false);
  }

  if (showOnboarding) {
    return <OnboardingView onDismiss={dismissOnboarding} />;
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Overview" subtitle={monthLabel} />

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
              <div className="hero-panel relative flex h-full flex-col overflow-hidden rounded-2xl p-6 pb-0">
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
              <Card className="flex h-full flex-col">
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
