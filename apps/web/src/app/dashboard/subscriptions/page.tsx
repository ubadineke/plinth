'use client';
import { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { formatKobo, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { MoreHorizontal, Plus, Play, FastForward, Copy, Check, CreditCard } from 'lucide-react';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'trialing', label: 'Trialing' },
  { id: 'incomplete', label: 'Incomplete' },
  { id: 'active', label: 'Active' },
  { id: 'past_due', label: 'Past Due' },
  { id: 'grace', label: 'Grace' },
  { id: 'delinquent', label: 'Delinquent' },
  { id: 'canceled', label: 'Canceled' },
];

interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  state: string;
  quantity: number;
  preferred_rail: string;
  current_period_end: string;
  next_bill_at: string;
  trial_end_at: string | null;
  created_at: string;
}
interface Customer { id: string; name: string; email: string }
interface Plan { id: string; name: string; amount_minor: string; interval: string }

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [clockDays, setClockDays] = useState('30');
  const [simNow, setSimNow] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [actionSub, setActionSub] = useState<Subscription | null>(null);

  async function refreshClock() {
    try {
      const c: any = await api.clock.get();
      setSimNow(c?.simulated_now ?? null);
    } catch { /* clock endpoint optional */ }
  }

  async function load() {
    setError('');
    try {
      const [s, c, p] = await Promise.all([
        api.subscriptions.list() as Promise<{ data: Subscription[] }>,
        api.customers.list() as Promise<{ data: Customer[] }>,
        api.plans.list() as Promise<{ data: Plan[] }>,
      ]);
      setSubs(s.data ?? []);
      setCustomers(c.data ?? []);
      setPlans(p.data ?? []);
      refreshClock();
    } catch (err: any) {
      setError(err.message ?? 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const customerById = Object.fromEntries(customers.map((c) => [c.id, c]));
  const planById = Object.fromEntries(plans.map((p) => [p.id, p]));

  const filtered = activeTab === 'all' ? subs : subs.filter((s) => s.state === activeTab);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  }

  async function runTick() {
    setBusy(true);
    try {
      const res: any = await api.tick.run();
      flash(`Billing tick ran${res?.renewed != null ? ` — ${res.renewed} renewed` : ''}.`);
      await load();
    } catch (err: any) {
      flash(`Tick failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function advanceClock() {
    const days = Number(clockDays);
    if (!Number.isFinite(days) || days <= 0) { flash('Enter a positive number of days.'); return; }
    setBusy(true);
    try {
      await api.clock.advance(Math.round(days * 24 * 60 * 60));
      flash(`Clock advanced ${days} day${days === 1 ? '' : 's'}. Run a billing tick to charge due subscriptions.`);
      await load();
    } catch (err: any) {
      flash(`Advance failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Subscriptions" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Tabs tabs={FILTER_TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="flex items-center gap-2">
            {/* Advance the test clock by a custom number of days */}
            <div className="flex items-center rounded-lg border border-line overflow-hidden bg-card">
              <input
                type="number"
                min={1}
                value={clockDays}
                onChange={(e) => setClockDays(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy) advanceClock(); }}
                disabled={busy}
                className="w-14 text-sm text-right font-mono bg-transparent px-2 py-1.5 outline-none tabular-nums disabled:opacity-60"
                aria-label="Days to advance"
              />
              <span className="text-xs text-faint pr-2 select-none">days</span>
              <button
                onClick={advanceClock}
                disabled={busy}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border-l border-line text-body hover:bg-soft disabled:opacity-60 transition-colors"
              >
                <FastForward size={14} /> Advance
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={runTick} disabled={busy}>
              <Play size={14} /> Run billing tick
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} disabled={customers.length === 0 || plans.length === 0}>
              <Plus size={14} /> New subscription
            </Button>
          </div>
        </div>

        {simNow && (
          <p className="text-xs text-faint">
            Simulated time: <span className="font-mono text-mid">{new Date(simNow).toLocaleString()}</span>
          </p>
        )}

        {notice && (
          <div className="text-xs text-jade-deep bg-jade-tint border border-jade/20 rounded-lg px-3 py-2">
            {notice}
          </div>
        )}
        {error && (
          <div className="text-xs text-danger bg-danger-tint border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Card>
          {loading ? (
            <div className="py-16 text-center"><p className="text-sm text-faint">Loading…</p></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-faint">No subscriptions in this state</p>
              {subs.length === 0 && customers.length > 0 && plans.length > 0 && (
                <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}><Plus size={14} /> Create your first subscription</Button>
              )}
              {(customers.length === 0 || plans.length === 0) && (
                <p className="text-xs text-faint mt-2">Add a customer and a plan first.</p>
              )}
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Plan</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Rail</Th>
                  <Th>State</Th>
                  <Th>Next Bill</Th>
                  <Th>Created</Th>
                  <Th></Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((sub, i) => {
                  const cust = customerById[sub.customer_id];
                  const plan = planById[sub.plan_id];
                  const amount = plan ? Number(plan.amount_minor) * sub.quantity : 0;
                  return (
                    <Tr key={sub.id} className="animate-row-in" style={{ animationDelay: `${Math.min(i, 12) * 28}ms` }}>
                      <Td>
                        <p className="font-medium text-ink">{cust?.name ?? sub.customer_id}</p>
                        <p className="text-xs font-mono text-faint">{sub.id}</p>
                      </Td>
                      <Td>{plan?.name ?? sub.plan_id}{sub.quantity > 1 && <span className="text-faint"> ×{sub.quantity}</span>}</Td>
                      <Td className="text-right font-mono text-[13px] font-medium text-ink">{formatKobo(amount)}</Td>
                      <Td><Badge status={sub.preferred_rail} /></Td>
                      <Td><Badge status={sub.state} /></Td>
                      <Td className="text-mid">{formatDate(sub.next_bill_at)}</Td>
                      <Td className="text-mid">{formatDate(sub.created_at)}</Td>
                      <Td>
                        <button onClick={() => setActionSub(sub)} className="text-faint hover:text-mid">
                          <MoreHorizontal size={16} />
                        </button>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </Card>

        <p className="text-xs text-faint">
          {filtered.length} subscription{filtered.length !== 1 ? 's' : ''}
          {activeTab !== 'all' && ` in ${activeTab.replace(/_/g, ' ')} state`}
        </p>
      </div>

      <CreateSubscriptionModal
        open={showCreate}
        customers={customers}
        plans={plans}
        onClose={() => setShowCreate(false)}
        onCreated={async () => { setShowCreate(false); flash('Subscription created.'); await load(); }}
      />

      <SubscriptionActionsModal
        open={!!actionSub}
        sub={actionSub}
        customer={actionSub ? customerById[actionSub.customer_id] : undefined}
        plan={actionSub ? planById[actionSub.plan_id] : undefined}
        onClose={() => setActionSub(null)}
        onChanged={async () => { await load(); }}
        flash={flash}
      />
    </div>
  );
}

function CreateSubscriptionModal({
  open, customers, plans, onClose, onCreated,
}: {
  open: boolean;
  customers: Customer[];
  plans: Plan[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [planId, setPlanId] = useState(plans[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [rail, setRail] = useState<'card' | 'transfer' | 'direct_debit'>('card');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setCustomerId(customers[0]?.id ?? '');
    setPlanId(plans[0]?.id ?? '');
    setQuantity(1);
    setRail('card');
    setErr('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!customerId || !planId) return;
    setSaving(true);
    setErr('');
    try {
      await api.subscriptions.create({ customer_id: customerId, plan_id: planId, quantity, preferred_rail: rail });
      onCreated();
    } catch (e: any) {
      setErr(e.message ?? 'Failed to create subscription');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="New subscription" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Customer">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
          </Select>
        </Field>
        <Field label="Plan">
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatKobo(Number(p.amount_minor))}/{p.interval}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} />
          </Field>
          <Field label="Payment rail">
            <Select value={rail} onChange={(e) => setRail(e.target.value as any)}>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
              <option value="direct_debit">Direct debit</option>
            </Select>
          </Field>
        </div>
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={saving || !customerId || !planId}>
            {saving ? 'Creating…' : 'Create subscription'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SubscriptionActionsModal({
  open, sub, customer, plan, onClose, onChanged, flash,
}: {
  open: boolean;
  sub: Subscription | null;
  customer?: Customer;
  plan?: Plan;
  onClose: () => void;
  onChanged: () => void;
  flash: (m: string) => void;
}) {
  const [checkout, setCheckout] = useState<{ checkoutLink: string; orderReference: string } | null>(null);
  const [working, setWorking] = useState('');
  const [copied, setCopied] = useState(false);
  // Cache the last non-null subscription so the panel keeps its content while the
  // close animation plays (the parent nulls `sub` immediately on close).
  const [cached, setCached] = useState<{ sub: Subscription; customer?: Customer; plan?: Plan } | null>(null);

  useEffect(() => {
    if (sub) {
      setCached({ sub, customer, plan });
      setCheckout(null);
      setWorking('');
      setCopied(false);
    }
  }, [sub, customer, plan]);

  const data = cached;
  const amount = data?.plan ? Number(data.plan.amount_minor) * data.sub.quantity : 0;

  async function genLink() {
    if (!data) return;
    setWorking('link');
    try {
      const res = await api.subscriptions.checkoutLink(data.sub.id);
      setCheckout({ checkoutLink: res.checkoutLink, orderReference: res.orderReference });
    } catch (e: any) {
      flash(`Checkout link failed: ${e.message}`);
    } finally {
      setWorking('');
    }
  }

  async function simulate() {
    if (!data) return;
    setWorking('sim');
    try {
      // orderReference convention: plinth_{tenantId}_{customerId}
      const tenantId = typeof window !== 'undefined' ? localStorage.getItem('nomba_tenant_id') ?? '' : '';
      const orderRef = checkout?.orderReference ?? `plinth_${tenantId}_${data.sub.customer_id}`;
      await api.webhooks.simulatePayment(orderRef, amount);
      flash('Payment simulated — card is now on file. Run a billing tick to charge.');
      onClose();
      onChanged();
    } catch (e: any) {
      flash(`Simulate failed: ${e.message}`);
    } finally {
      setWorking('');
    }
  }

  return (
    <Modal open={open} title="Subscription actions" onClose={onClose}>
      {data && (
        <div className="space-y-4">
          <div className="text-sm">
            <p className="font-medium text-ink">{data.customer?.name ?? data.sub.customer_id}</p>
            <p className="text-xs text-mid flex items-center gap-1.5">{data.plan?.name ?? data.sub.plan_id} · <span className="font-mono">{formatKobo(amount)}</span> · <Badge status={data.sub.state} /></p>
          </div>

          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={genLink} disabled={working === 'link'}>
              <CreditCard size={14} /> {working === 'link' ? 'Generating…' : 'Generate checkout link'}
            </Button>

            {checkout && (
              <div className="flex items-center gap-2 bg-soft border border-line rounded-lg px-3 py-2">
                <code className="flex-1 text-xs font-mono text-ink break-all">{checkout.checkoutLink}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(checkout.checkoutLink); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="shrink-0 text-faint hover:text-jade-deep"
                >
                  {copied ? <Check size={14} className="text-jade" /> : <Copy size={14} />}
                </button>
              </div>
            )}

            <Button variant="secondary" size="sm" className="w-full justify-start" onClick={simulate} disabled={working === 'sim'}>
              <Play size={14} /> {working === 'sim' ? 'Simulating…' : 'Simulate payment (dev)'}
            </Button>
            <p className="text-xs text-faint">
              In fake-Nomba mode, "Simulate payment" tokenizes a test card onto this customer's subscriptions so billing ticks can charge.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-body mb-1.5">{label}</label>
      {children}
    </div>
  );
}
