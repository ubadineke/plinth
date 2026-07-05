'use client';
import { useState, useEffect, useCallback } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import { formatKobo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Plus, CheckCircle, Layers, FolderPlus, HelpCircle, Trash2, Archive } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface PlanGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Plan {
  id: string;
  plan_group_id: string;
  name: string;
  amount_minor: string;
  interval: string;
  interval_count: number;
  trial_period_days: number;
  lookup_key?: string | null;
  created_at: string;
}

type BillingInterval = 'day' | 'week' | 'month' | 'year';

const PRESETS = [
  {
    id: 'saas_standard',
    name: 'SaaS-Standard',
    recommended: true,
    description: [
      'Immediate upgrades, prorated',
      'Downgrades at period end',
      '7-day grace period',
      'Block upgrades while dunning',
    ],
  },
  {
    id: 'lenient',
    name: 'Lenient',
    recommended: false,
    description: [
      'All changes at period end',
      '14-day grace period',
      'Allow all while dunning',
    ],
  },
  {
    id: 'strict',
    name: 'Strict',
    recommended: false,
    description: [
      'Immediate everything',
      '3-day grace period',
      'Block all while dunning',
    ],
  },
  {
    id: 'transfer_first',
    name: 'Transfer-First',
    recommended: false,
    description: [
      'Long grace period (21 days)',
      'Optimized for VA payments',
      'Allow all during dunning',
    ],
  },
  {
    id: 'postpaid',
    name: 'Postpaid / Arrears',
    recommended: false,
    description: [
      'Arrears billing mode',
      'Charge after period',
      'Standard grace period',
    ],
  },
];

// Signatures used to detect which preset a tenant's current policy matches.
// Mirrors the knob bundles in the engine's policy.service.ts PRESETS.
const PRESET_SIGNATURE: Record<string, { activation_strategy: string; billing_mode: string; grace_days: number; change_during_dunning: string; cancel_policy: string }> = {
  saas_standard:  { activation_strategy: 'activate_then_charge', billing_mode: 'advance', grace_days: 7,  change_during_dunning: 'gate_upgrades', cancel_policy: 'end_of_period' },
  lenient:        { activation_strategy: 'activate_then_charge', billing_mode: 'advance', grace_days: 14, change_during_dunning: 'allow_all',     cancel_policy: 'end_of_period' },
  strict:         { activation_strategy: 'charge_to_activate',   billing_mode: 'advance', grace_days: 3,  change_during_dunning: 'block_all',     cancel_policy: 'immediate' },
  transfer_first: { activation_strategy: 'activate_then_charge', billing_mode: 'advance', grace_days: 21, change_during_dunning: 'allow_all',     cancel_policy: 'end_of_period' },
  postpaid:       { activation_strategy: 'activate_then_charge', billing_mode: 'arrears', grace_days: 7,  change_during_dunning: 'gate_upgrades', cancel_policy: 'end_of_period' },
};

function detectPreset(policy: any): string | null {
  if (!policy) return null;
  for (const [id, sig] of Object.entries(PRESET_SIGNATURE)) {
    if (
      policy.activation_strategy === sig.activation_strategy &&
      policy.billing_mode === sig.billing_mode &&
      policy.grace_days === sig.grace_days &&
      policy.change_during_dunning === sig.change_during_dunning &&
      policy.cancel_policy === sig.cancel_policy
    ) return id;
  }
  return null;
}

export default function CatalogPage() {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [applyingPreset, setApplyingPreset] = useState(false);

  useEffect(() => {
    api.policy.get()
      .then((p: any) => { setPolicy(p); setActivePreset(detectPreset(p)); })
      .catch(() => {});
  }, []);

  // Catalog state
  const [groups, setGroups] = useState<PlanGroup[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  // Kept around during the close animation so the panel doesn't blank out mid-exit.
  const [cachedDeletePlan, setCachedDeletePlan] = useState<Plan | null>(null);
  useEffect(() => {
    if (deletePlan) setCachedDeletePlan(deletePlan);
  }, [deletePlan]);

  async function confirmDelete() {
    if (!deletePlan) return;
    setDeleting(true);
    setDeleteErr(null);
    try {
      await api.plans.remove(deletePlan.id);
      setDeletePlan(null);
      await loadCatalog(); // archived plans drop out of the active-only list
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : 'Failed to delete plan');
    } finally {
      setDeleting(false);
    }
  }

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [groupsRes, plansRes] = await Promise.all([
        api.planGroups.list() as Promise<{ data: PlanGroup[] }>,
        api.plans.list() as Promise<{ data: Plan[] }>,
      ]);
      setGroups(groupsRes.data ?? []);
      setPlans(plansRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  async function applyPreset(id: string) {
    if (pendingPreset !== id) {
      setPendingPreset(id);
      return;
    }
    setApplyingPreset(true);
    try {
      const updated = await api.policy.applyPreset(id);
      setPolicy(updated);
      setActivePreset(id);
      setPendingPreset(null);
    } catch {
      // leave pending so the user can retry / cancel
    } finally {
      setApplyingPreset(false);
    }
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Catalog" subtitle="Plans & billing presets" />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Plans */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-ink mb-1">Core Plans</h2>
                <p className="text-xs text-mid">Plans available to your customers</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGroupModal(true)}
              >
                <FolderPlus size={14} />
                Add Plan Group
              </Button>
            </div>

            {loading && (
              <div className="space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-soft animate-pulse" />
                ))}
              </div>
            )}

            {!loading && error && (
              <Card className="p-5">
                <p className="text-sm text-danger mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={loadCatalog}>Retry</Button>
              </Card>
            )}

            {!loading && !error && groups.length === 0 && (
              <Card className="p-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-jade-tint flex items-center justify-center mx-auto mb-3">
                  <Layers size={20} className="text-jade-deep" />
                </div>
                <h3 className="text-sm font-semibold text-ink">No plan groups yet</h3>
                <p className="text-xs text-mid mt-1 mb-4">
                  Plans live inside plan groups. Create a plan group to get started.
                </p>
                <Button size="sm" onClick={() => setShowGroupModal(true)}>
                  <FolderPlus size={14} />
                  Create plan group
                </Button>
              </Card>
            )}

            {!loading && !error && groups.length > 0 && (
              <div className="space-y-6">
                {groups.map((group) => {
                  const groupPlans = plans.filter((p) => p.plan_group_id === group.id);
                  return (
                    <div key={group.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <Layers size={14} className="text-faint shrink-0" />
                        <h3 className="text-sm font-semibold text-ink">{group.name}</h3>
                        <span className="text-xs text-faint">
                          {groupPlans.length} {groupPlans.length === 1 ? 'plan' : 'plans'}
                        </span>
                      </div>
                      {group.description && (
                        <p className="text-xs text-mid mb-3 ml-6">{group.description}</p>
                      )}

                      <div className="space-y-3">
                        {groupPlans.length === 0 ? (
                          <p className="text-xs text-faint ml-6">No plans in this group yet.</p>
                        ) : (
                          groupPlans.map((plan) => (
                            <Card key={plan.id} className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="text-sm font-semibold text-ink">{plan.name}</h4>
                                  <p className="font-mono text-xl font-semibold text-ink mt-1">
                                    {formatKobo(Number(plan.amount_minor))}
                                    <span className="text-sm font-normal font-sans text-faint"> / {plan.interval}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Button variant="outline" size="sm" onClick={() => setEditingPlan(plan)}>Edit</Button>
                                  <button
                                    onClick={() => { setDeletePlan(plan); setDeleteErr(null); }}
                                    className="rounded-lg border border-line p-1.5 text-faint hover:border-danger/40 hover:text-danger"
                                    title="Archive or delete plan"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {plan.interval_count > 1 && (
                                  <Badge status="card" label={`every ${plan.interval_count} ${plan.interval}s`} />
                                )}
                                {plan.trial_period_days > 0 && (
                                  <Badge status="trialing" label={`${plan.trial_period_days}-day trial`} />
                                )}
                                {plan.lookup_key && (
                                  <span className="rounded bg-soft px-1.5 py-0.5 font-mono text-[10px] text-mid">
                                    {plan.lookup_key}
                                  </span>
                                )}
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && groups.length > 0 && (
              <Button variant="outline" className="mt-4 w-full" onClick={() => setShowPlanModal(true)}>
                <Plus size={14} />
                Add Plan
              </Button>
            )}
          </div>

          {/* Right: Presets */}
          <div>
            <h2 className="text-sm font-semibold text-ink mb-1">Billing Presets</h2>
            <p className="text-xs text-mid mb-2">
              Apply a preset to configure all your billing policy knobs at once
            </p>
            {policy && (
              <p className="text-xs text-mid mb-4">
                Current activation:{' '}
                <span className="font-medium text-body">
                  {policy.activation_strategy === 'charge_to_activate'
                    ? 'Strict — charge before access'
                    : 'Optimistic — access while billing'}
                </span>
                {' '}· {policy.billing_mode === 'arrears' ? 'arrears (pay after)' : 'advance (pay upfront)'}
                {' '}· grace {policy.grace_days}d
              </p>
            )}

            <div className="space-y-3">
              {PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                const isPending = pendingPreset === preset.id;
                return (
                  <Card
                    key={preset.id}
                    className={cn(
                      'p-4',
                      isActive && 'border-jade/20 bg-jade-tint/40',
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isActive && <CheckCircle size={14} className="text-jade" />}
                        <h3 className="text-sm font-semibold text-ink">{preset.name}</h3>
                        {preset.recommended && (
                          <span className="text-xs bg-jade-tint text-jade-deep px-1.5 py-0.5 rounded font-medium">
                            recommended
                          </span>
                        )}
                        {isActive && (
                          <span className="text-xs bg-jade-tint text-jade-deep px-1.5 py-0.5 rounded font-medium">
                            active
                          </span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-1 mb-3">
                      {preset.description.map((d) => (
                        <li key={d} className="text-xs text-mid">· {d}</li>
                      ))}
                    </ul>
                    {!isActive && (
                      <div>
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-warn flex-1">
                              This will update your billing policy. Continue?
                            </p>
                            <Button size="sm" disabled={applyingPreset} onClick={() => applyPreset(preset.id)}>{applyingPreset ? 'Applying…' : 'Confirm'}</Button>
                            <Button variant="ghost" size="sm" disabled={applyingPreset} onClick={() => setPendingPreset(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => applyPreset(preset.id)}>
                            Apply preset
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AddPlanGroupModal
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onCreated={() => {
          setShowGroupModal(false);
          loadCatalog(); // soft refresh — pull the full record back
        }}
      />

      <AddPlanModal
        open={showPlanModal}
        groups={groups}
        onClose={() => setShowPlanModal(false)}
        onCreated={() => {
          setShowPlanModal(false);
          loadCatalog(); // soft refresh — the create response lacks group/interval fields
        }}
      />

      <EditPlanModal
        open={!!editingPlan}
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
        onSaved={(updated) => {
          setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setEditingPlan(null);
        }}
      />

      <Modal
        open={!!deletePlan}
        title={cachedDeletePlan ? `Delete “${cachedDeletePlan.name}”?` : ''}
        subtitle="Plans with subscribers are archived, not deleted."
        icon={<Trash2 size={20} className="text-danger" />}
        onClose={() => setDeletePlan(null)}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-lg bg-warn-tint px-3 py-2.5">
            <Archive size={15} className="mt-0.5 shrink-0 text-warn" />
            <p className="text-xs leading-relaxed text-warn">
              If anyone is subscribed, the plan is <strong>archived</strong> — existing subscribers keep billing and
              history is preserved; it just stops accepting new sign-ups. Only a never-subscribed plan is permanently deleted.
            </p>
          </div>
          {deleteErr && <p className="text-xs text-danger">{deleteErr}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDeletePlan(null)}>Cancel</Button>
            <Button type="button" variant="destructive" size="sm" disabled={deleting} onClick={confirmDelete}>
              {deleting ? 'Working…' : 'Delete / Archive'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 mb-1">
        <span className="text-xs font-medium text-body">{label}</span>
        {hint && (
          <Tooltip content={hint}>
            <HelpCircle size={12} className="text-faint cursor-help" />
          </Tooltip>
        )}
      </span>
      {children}
    </label>
  );
}

function AddPlanGroupModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (group: PlanGroup) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setErr(null);
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      const created = (await api.planGroups.create({
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      })) as PlanGroup;
      onCreated(created);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create plan group');
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Add plan group"
      subtitle="A container that groups related plans together"
      icon={<FolderPlus size={20} className="text-jade-deep" />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pro Tiers"
            autoFocus
            required
          />
        </Field>
        <Field label="Description (optional)">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group for?"
          />
        </Field>
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={submitting || !name.trim()}>
            {submitting ? 'Creating…' : 'Create group'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddPlanModal({
  open,
  groups,
  onClose,
  onCreated,
}: {
  open: boolean;
  groups: PlanGroup[];
  onClose: () => void;
  onCreated: (plan: Plan) => void;
}) {
  const [planGroupId, setPlanGroupId] = useState(groups[0]?.id ?? '');
  const [name, setName] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [intervalCount, setIntervalCount] = useState('1');
  const [trialDays, setTrialDays] = useState('0');
  const [lookupKey, setLookupKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPlanGroupId(groups[0]?.id ?? '');
    setName('');
    setAmountNaira('');
    setInterval('month');
    setIntervalCount('1');
    setTrialDays('0');
    setLookupKey('');
    setErr(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectClass =
    'w-full h-9 rounded-lg border border-line bg-card px-3 text-[13.5px] text-ink focus:outline-none focus:border-jade focus:ring-2 focus:ring-jade/25';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(amountNaira);
    if (!planGroupId || !name.trim() || !(amount > 0)) return;
    setSubmitting(true);
    setErr(null);
    try {
      const created = (await api.plans.create({
        plan_group_id: planGroupId,
        name: name.trim(),
        amount_minor: Math.round(amount * 100),
        billing_interval: interval,
        billing_interval_count: Number(intervalCount) || 1,
        trial_period_days: Number(trialDays) || 0,
        lookup_key: lookupKey.trim(),
      })) as Plan;
      onCreated(created);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create plan');
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Add plan"
      subtitle="Create a billable plan inside a plan group"
      icon={<Plus size={20} className="text-jade-deep" />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Plan group">
          <select
            value={planGroupId}
            onChange={(e) => setPlanGroupId(e.target.value)}
            className={selectClass}
            required
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Pro Monthly"
            autoFocus
            required
          />
        </Field>
        <Field label="Amount (₦)" hint="What each customer is charged every billing cycle, in naira. Stored internally in kobo.">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amountNaira}
            onChange={(e) => setAmountNaira(e.target.value)}
            placeholder="5000"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Billing interval" hint="How often the customer is charged — daily, weekly, monthly, or yearly.">
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value as BillingInterval)}
              className={selectClass}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </Field>
          <Field label="Interval count" hint="Multiplies the interval. e.g. interval Month × count 3 = billed once every 3 months. Leave at 1 for a standard cycle.">
            <Input
              type="number"
              min="1"
              step="1"
              value={intervalCount}
              onChange={(e) => setIntervalCount(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Trial period (days)" hint="Free days before the first charge. The subscription stays in 'trialing' until it converts. 0 = charge immediately.">
          <Input
            type="number"
            min="0"
            step="1"
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
          />
        </Field>
        <Field label="Lookup key" hint="A stable handle (e.g. standard_monthly) your app references instead of the plan's UUID. Lowercase letters, numbers and underscores. Unique per catalog.">
          <Input
            value={lookupKey}
            onChange={(e) => setLookupKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
            placeholder="e.g. standard_monthly"
            required
          />
        </Field>
        {err && <p className="text-xs text-danger">{err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !planGroupId || !name.trim() || !(Number(amountNaira) > 0) || !lookupKey.trim()}
          >
            {submitting ? 'Creating…' : 'Create plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditPlanModal({
  open,
  plan,
  onClose,
  onSaved,
}: {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  onSaved: (plan: Plan) => void;
}) {
  const [cached, setCached] = useState<Plan | null>(null);
  const [name, setName] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [intervalCount, setIntervalCount] = useState('1');
  const [trialDays, setTrialDays] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!plan) return;
    setCached(plan);
    setName(plan.name);
    setAmountNaira(String(Number(plan.amount_minor) / 100));
    setInterval(plan.interval as BillingInterval);
    setIntervalCount(String(plan.interval_count));
    setTrialDays(String(plan.trial_period_days));
    setErr(null);
  }, [plan]);

  const selectClass =
    'w-full h-9 rounded-lg border border-line bg-card px-3 text-[13.5px] text-ink focus:outline-none focus:border-jade focus:ring-2 focus:ring-jade/25';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cached) return;
    const amount = Number(amountNaira);
    if (!name.trim() || !(amount > 0)) return;
    setSubmitting(true);
    setErr(null);
    try {
      const updated = (await api.plans.update(cached.id, {
        name: name.trim(),
        amount_minor: Math.round(amount * 100),
        billing_interval: interval,
        billing_interval_count: Number(intervalCount) || 1,
        trial_period_days: Number(trialDays) || 0,
      })) as Plan;
      onSaved(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to update plan');
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Edit plan"
      subtitle="Changes apply to future billing; existing subscriptions keep their current period until renewal."
      icon={<Plus size={20} className="text-jade-deep" />}
      onClose={onClose}
    >
      {cached && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </Field>
          <Field label="Amount (₦)" hint="What each customer is charged every billing cycle, in naira. Stored internally in kobo.">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amountNaira}
              onChange={(e) => setAmountNaira(e.target.value)}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billing interval" hint="How often the customer is charged — daily, weekly, monthly, or yearly.">
              <select value={interval} onChange={(e) => setInterval(e.target.value as BillingInterval)} className={selectClass}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
            </Field>
            <Field label="Interval count" hint="Multiplies the interval. e.g. interval Month × count 3 = billed once every 3 months. Leave at 1 for a standard cycle.">
              <Input type="number" min="1" step="1" value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} />
            </Field>
          </div>
          <Field label="Trial period (days)" hint="Free days before the first charge. The subscription stays in 'trialing' until it converts. 0 = charge immediately.">
            <Input type="number" min="0" step="1" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} />
          </Field>
          {err && <p className="text-xs text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={submitting || !name.trim() || !(Number(amountNaira) > 0)}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
