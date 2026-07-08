'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { formatKobo, formatDate } from '@/lib/utils';
import {
  useSubscriptions,
  useCreateSubscription,
  useCheckoutLink,
  useSimulatePayment,
} from '@/lib/queries/subscriptions';
import { useCustomers } from '@/lib/queries/customers';
import { usePlans, type Plan } from '@/lib/queries/plans';
import { useClock, useAdvanceClock, useRunTick } from '@/lib/queries/clock';
import {
  createSubscriptionSchema,
  type CreateSubscriptionFormInput,
  type CreateSubscriptionFormValues,
} from '@/lib/schemas/subscription';
import type { Customer, Subscription } from '@/lib/types';
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

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [notice, setNotice] = useState('');
  const [clockDays, setClockDays] = useState('30');
  const [showCreate, setShowCreate] = useState(false);
  const [actionSub, setActionSub] = useState<Subscription | null>(null);

  const subscriptionsQuery = useSubscriptions();
  const customersQuery = useCustomers();
  const plansQuery = usePlans();
  const clockQuery = useClock();
  const runTick = useRunTick();
  const advanceClock = useAdvanceClock();

  const subs = subscriptionsQuery.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];
  const plans = plansQuery.data?.data ?? [];
  const simNow = clockQuery.data?.simulated_now ?? null;

  const loading = subscriptionsQuery.isPending || customersQuery.isPending || plansQuery.isPending;
  const error = subscriptionsQuery.error instanceof Error ? subscriptionsQuery.error.message : '';
  const busy = runTick.isPending || advanceClock.isPending;

  const customerById = Object.fromEntries(customers.map((c) => [c.id, c]));
  const planById = Object.fromEntries(plans.map((p) => [p.id, p]));

  const filtered = activeTab === 'all' ? subs : subs.filter((s) => s.state === activeTab);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  }

  async function handleRunTick() {
    try {
      const res = await runTick.mutateAsync();
      flash(`Billing tick ran${res?.renewed != null ? ` — ${res.renewed} renewed` : ''}.`);
    } catch (e) {
      flash(`Tick failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }

  async function handleAdvanceClock() {
    const days = Number(clockDays);
    if (!Number.isFinite(days) || days <= 0) { flash('Enter a positive number of days.'); return; }
    try {
      await advanceClock.mutateAsync(Math.round(days * 24 * 60 * 60));
      flash(`Clock advanced ${days} day${days === 1 ? '' : 's'}. Run a billing tick to charge due subscriptions.`);
    } catch (e) {
      flash(`Advance failed: ${e instanceof Error ? e.message : 'unknown error'}`);
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
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy) handleAdvanceClock(); }}
                disabled={busy}
                className="w-14 text-sm text-right font-mono bg-transparent px-2 py-1.5 outline-none tabular-nums disabled:opacity-60"
                aria-label="Days to advance"
              />
              <span className="text-xs text-faint pr-2 select-none">days</span>
              <button
                onClick={handleAdvanceClock}
                disabled={busy}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border-l border-line text-body hover:bg-soft disabled:opacity-60 transition-colors"
              >
                <FastForward size={14} /> Advance
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={handleRunTick} disabled={busy}>
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

        <Card>
          {loading ? (
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
                {Array.from({ length: 6 }).map((_, i) => (
                  <Tr key={i}>
                    <Td><Skeleton className="h-4 w-28" /></Td>
                    <Td><Skeleton className="h-4 w-24" /></Td>
                    <Td><Skeleton className="h-4 w-16 ml-auto" /></Td>
                    <Td><Skeleton className="h-5 w-14 rounded-full" /></Td>
                    <Td><Skeleton className="h-5 w-16 rounded-full" /></Td>
                    <Td><Skeleton className="h-3.5 w-20" /></Td>
                    <Td><Skeleton className="h-3.5 w-20" /></Td>
                    <Td><Skeleton className="h-7 w-7 rounded-lg" /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
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
                      <Td>{sub.preferred_rail && <Badge status={sub.preferred_rail} />}</Td>
                      <Td><Badge status={sub.state} /></Td>
                      <Td className="text-mid">{sub.next_bill_at ? formatDate(sub.next_bill_at) : '—'}</Td>
                      <Td className="text-mid">{sub.created_at ? formatDate(sub.created_at) : '—'}</Td>
                      <Td>
                        <button
                          onClick={() => setActionSub(sub)}
                          aria-label="Subscription actions"
                          className="text-faint hover:text-mid"
                        >
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
        onCreated={() => { setShowCreate(false); flash('Subscription created.'); }}
      />

      <SubscriptionActionsModal
        open={!!actionSub}
        sub={actionSub}
        customer={actionSub ? customerById[actionSub.customer_id] : undefined}
        plan={actionSub ? planById[actionSub.plan_id] : undefined}
        onClose={() => setActionSub(null)}
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
  const createSubscription = useCreateSubscription();
  const createSubscriptionRef = useRef(createSubscription);
  createSubscriptionRef.current = createSubscription;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<CreateSubscriptionFormInput, any, CreateSubscriptionFormValues>({
    resolver: zodResolver(createSubscriptionSchema),
    mode: 'onChange',
    defaultValues: { customerId: '', planId: '', quantity: 1, rail: 'card' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ customerId: customers[0]?.id ?? '', planId: plans[0]?.id ?? '', quantity: 1, rail: 'card' });
    createSubscriptionRef.current.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createSubscription.mutateAsync({
        customer_id: values.customerId,
        plan_id: values.planId,
        quantity: values.quantity,
        preferred_rail: values.rail,
      });
      onCreated();
    } catch {
      // surfaced via createSubscription.isError/.error below
    }
  });

  return (
    <Modal open={open} title="New subscription" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Customer" id="new-sub-customer">
          <Select id="new-sub-customer" {...register('customerId')}>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
          </Select>
        </Field>
        <Field label="Plan" id="new-sub-plan">
          <Select id="new-sub-plan" {...register('planId')}>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatKobo(Number(p.amount_minor))}/{p.interval}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity" id="new-sub-quantity">
            <Input id="new-sub-quantity" type="number" min={1} {...register('quantity')} />
          </Field>
          <Field label="Payment rail" id="new-sub-rail">
            <Select id="new-sub-rail" {...register('rail')}>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
              <option value="direct_debit">Direct debit</option>
            </Select>
          </Field>
        </div>
        {createSubscription.isError && (
          <p className="text-xs text-danger">
            {createSubscription.error instanceof Error ? createSubscription.error.message : 'Failed to create subscription'}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={!isValid || createSubscription.isPending}>
            {createSubscription.isPending ? 'Creating…' : 'Create subscription'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SubscriptionActionsModal({
  open, sub, customer, plan, onClose, flash,
}: {
  open: boolean;
  sub: Subscription | null;
  customer?: Customer;
  plan?: Plan;
  onClose: () => void;
  flash: (m: string) => void;
}) {
  const checkoutLink = useCheckoutLink();
  const simulatePayment = useSimulatePayment();
  const [checkout, setCheckout] = useState<{ checkoutLink: string; orderReference: string } | null>(null);
  const [copied, setCopied] = useState(false);
  // Cache the last non-null subscription so the panel keeps its content while the
  // close animation plays (the parent nulls `sub` immediately on close).
  const [cached, setCached] = useState<{ sub: Subscription; customer?: Customer; plan?: Plan } | null>(null);

  useEffect(() => {
    if (sub) {
      setCached({ sub, customer, plan });
      setCheckout(null);
      setCopied(false);
    }
  }, [sub, customer, plan]);

  const data = cached;
  const amount = data?.plan ? Number(data.plan.amount_minor) * data.sub.quantity : 0;

  async function genLink() {
    if (!data) return;
    try {
      const res = await checkoutLink.mutateAsync(data.sub.id);
      setCheckout({ checkoutLink: res.checkoutLink, orderReference: res.orderReference });
    } catch (e) {
      flash(`Checkout link failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
  }

  async function simulate() {
    if (!data) return;
    try {
      // orderReference convention: plinth_{tenantId}_{customerId}
      const tenantId = typeof window !== 'undefined' ? localStorage.getItem('nomba_tenant_id') ?? '' : '';
      const orderRef = checkout?.orderReference ?? `plinth_${tenantId}_${data.sub.customer_id}`;
      await simulatePayment.mutateAsync({ orderReference: orderRef, amountMinor: amount });
      flash('Payment simulated — card is now on file. Run a billing tick to charge.');
      onClose();
    } catch (e) {
      flash(`Simulate failed: ${e instanceof Error ? e.message : 'unknown error'}`);
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
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={genLink} disabled={checkoutLink.isPending}>
              <CreditCard size={14} /> {checkoutLink.isPending ? 'Generating…' : 'Generate checkout link'}
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

            <Button variant="secondary" size="sm" className="w-full justify-start" onClick={simulate} disabled={simulatePayment.isPending}>
              <Play size={14} /> {simulatePayment.isPending ? 'Simulating…' : 'Simulate payment (dev)'}
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

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-body mb-1.5">{label}</label>
      {children}
    </div>
  );
}
