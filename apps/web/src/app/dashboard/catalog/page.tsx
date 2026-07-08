'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { formatKobo, cn } from '@/lib/utils';
import { Plus, CheckCircle, Layers, FolderPlus, HelpCircle, Trash2, Archive } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { usePolicy, useApplyPolicyPreset, type Policy } from '@/lib/queries/policy';
import { usePlanGroups, useCreatePlanGroup, type PlanGroup } from '@/lib/queries/plan-groups';
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan, type Plan } from '@/lib/queries/plans';
import {
  planGroupSchema, type PlanGroupFormValues,
  planSchema, type PlanFormInput, type PlanFormValues,
  editPlanSchema, type EditPlanFormInput, type EditPlanFormValues,
} from '@/lib/schemas/catalog';

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

function detectPreset(policy: Policy | undefined): string | null {
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
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);

  const policyQuery = usePolicy();
  const groupsQuery = usePlanGroups();
  const plansQuery = usePlans();
  const applyPolicyPreset = useApplyPolicyPreset();
  const deletePlanMutation = useDeletePlan();

  const policy = policyQuery.data;
  const activePreset = detectPreset(policy);
  const groups = groupsQuery.data?.data ?? [];
  const plans = plansQuery.data?.data ?? [];

  const loading = groupsQuery.isPending || plansQuery.isPending;
  const error = groupsQuery.error instanceof Error ? groupsQuery.error.message
    : plansQuery.error instanceof Error ? plansQuery.error.message
    : null;

  // Modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  // Kept around during the close animation so the panel doesn't blank out mid-exit.
  const [cachedDeletePlan, setCachedDeletePlan] = useState<Plan | null>(null);
  useEffect(() => {
    if (deletePlan) setCachedDeletePlan(deletePlan);
  }, [deletePlan]);

  async function confirmDelete() {
    if (!deletePlan) return;
    setDeleteErr(null);
    try {
      await deletePlanMutation.mutateAsync(deletePlan.id);
      setDeletePlan(null);
    } catch (e) {
      setDeleteErr(e instanceof Error ? e.message : 'Failed to delete plan');
    }
  }

  async function applyPreset(id: string) {
    if (pendingPreset !== id) {
      setPendingPreset(id);
      return;
    }
    try {
      await applyPolicyPreset.mutateAsync(id);
      setPendingPreset(null);
    } catch {
      // leave pending so the user can retry / cancel
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
              <div className="space-y-6">
                {[0, 1].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-3.5 rounded" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                    {[0, 1].map((j) => (
                      <Card key={j} className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-7 w-32" />
                          </div>
                          <div className="flex gap-1.5">
                            <Skeleton className="h-7 w-12 rounded-lg" />
                            <Skeleton className="h-7 w-7 rounded-lg" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!loading && error && (
              <Card className="p-5">
                <p className="text-sm text-danger mb-3">{error}</p>
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
                            <Button size="sm" disabled={applyPolicyPreset.isPending} onClick={() => applyPreset(preset.id)}>{applyPolicyPreset.isPending ? 'Applying…' : 'Confirm'}</Button>
                            <Button variant="ghost" size="sm" disabled={applyPolicyPreset.isPending} onClick={() => setPendingPreset(null)}>Cancel</Button>
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
      />

      <AddPlanModal
        open={showPlanModal}
        groups={groups}
        onClose={() => setShowPlanModal(false)}
      />

      <EditPlanModal
        open={!!editingPlan}
        plan={editingPlan}
        onClose={() => setEditingPlan(null)}
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
            <Button type="button" variant="destructive" size="sm" disabled={deletePlanMutation.isPending} onClick={confirmDelete}>
              {deletePlanMutation.isPending ? 'Working…' : 'Delete / Archive'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, hint, id, children }: { label: string; hint?: string; id?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="block">
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

function AddPlanGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createPlanGroup = useCreatePlanGroup();
  const createPlanGroupRef = useRef(createPlanGroup);
  createPlanGroupRef.current = createPlanGroup;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<PlanGroupFormValues>({
    resolver: zodResolver(planGroupSchema),
    mode: 'onChange',
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ name: '', description: '' });
    createPlanGroupRef.current.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createPlanGroup.mutateAsync({
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
      });
      onClose();
    } catch {
      // surfaced via createPlanGroup.isError/.error below
    }
  });

  return (
    <Modal
      open={open}
      title="Add plan group"
      subtitle="A container that groups related plans together"
      icon={<FolderPlus size={20} className="text-jade-deep" />}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" id="new-group-name">
          <Input id="new-group-name" {...register('name')} placeholder="e.g. Pro Tiers" autoFocus />
        </Field>
        <Field label="Description (optional)" id="new-group-description">
          <Input id="new-group-description" {...register('description')} placeholder="What is this group for?" />
        </Field>
        {createPlanGroup.isError && (
          <p className="text-xs text-danger">
            {createPlanGroup.error instanceof Error ? createPlanGroup.error.message : 'Failed to create plan group'}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={!isValid || createPlanGroup.isPending}>
            {createPlanGroup.isPending ? 'Creating…' : 'Create group'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddPlanModal({
  open, groups, onClose,
}: {
  open: boolean;
  groups: PlanGroup[];
  onClose: () => void;
}) {
  const createPlan = useCreatePlan();
  const createPlanRef = useRef(createPlan);
  createPlanRef.current = createPlan;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid, errors },
  } = useForm<PlanFormInput, any, PlanFormValues>({
    resolver: zodResolver(planSchema),
    mode: 'onChange',
    defaultValues: { planGroupId: '', name: '', amountNaira: '', interval: 'month', intervalCount: 1, trialDays: 0, lookupKey: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ planGroupId: groups[0]?.id ?? '', name: '', amountNaira: '', interval: 'month', intervalCount: 1, trialDays: 0, lookupKey: '' });
    createPlanRef.current.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groups, reset]);

  const lookupKeyField = register('lookupKey');

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createPlan.mutateAsync({
        plan_group_id: values.planGroupId,
        name: values.name,
        amount_minor: Math.round(values.amountNaira * 100),
        billing_interval: values.interval,
        billing_interval_count: values.intervalCount,
        trial_period_days: values.trialDays,
        lookup_key: values.lookupKey,
      });
      onClose();
    } catch {
      // surfaced via createPlan.isError/.error below
    }
  });

  return (
    <Modal
      open={open}
      title="Add plan"
      subtitle="Create a billable plan inside a plan group"
      icon={<Plus size={20} className="text-jade-deep" />}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Plan group" id="new-plan-group">
          <Select id="new-plan-group" {...register('planGroupId')}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Name" id="new-plan-name">
          <Input id="new-plan-name" {...register('name')} placeholder="e.g. Pro Monthly" autoFocus />
        </Field>
        <Field label="Amount (₦)" hint="What each customer is charged every billing cycle, in naira. Stored internally in kobo." id="new-plan-amount">
          <Input id="new-plan-amount" type="number" min="0" step="0.01" {...register('amountNaira')} placeholder="5000" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Billing interval" hint="How often the customer is charged — daily, weekly, monthly, or yearly." id="new-plan-interval">
            <Select id="new-plan-interval" {...register('interval')}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </Select>
          </Field>
          <Field label="Interval count" hint="Multiplies the interval. e.g. interval Month × count 3 = billed once every 3 months. Leave at 1 for a standard cycle." id="new-plan-interval-count">
            <Input id="new-plan-interval-count" type="number" min="1" step="1" {...register('intervalCount')} />
          </Field>
        </div>
        <Field label="Trial period (days)" hint="Free days before the first charge. The subscription stays in 'trialing' until it converts. 0 = charge immediately." id="new-plan-trial-days">
          <Input id="new-plan-trial-days" type="number" min="0" step="1" {...register('trialDays')} />
        </Field>
        <Field label="Lookup key" hint="A stable handle (e.g. standard_monthly) your app references instead of the plan's UUID. Lowercase letters, numbers and underscores. Unique per catalog." id="new-plan-lookup-key">
          <Input
            id="new-plan-lookup-key"
            {...lookupKeyField}
            onChange={(e) => {
              e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
              lookupKeyField.onChange(e);
            }}
            placeholder="e.g. standard_monthly"
          />
          {errors.lookupKey && <p className="text-xs text-danger mt-1">{errors.lookupKey.message}</p>}
        </Field>
        {createPlan.isError && (
          <p className="text-xs text-danger">
            {createPlan.error instanceof Error ? createPlan.error.message : 'Failed to create plan'}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={!isValid || createPlan.isPending}>
            {createPlan.isPending ? 'Creating…' : 'Create plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditPlanModal({
  open, plan, onClose,
}: {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
}) {
  const updatePlan = useUpdatePlan();
  const [cached, setCached] = useState<Plan | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<EditPlanFormInput, any, EditPlanFormValues>({
    resolver: zodResolver(editPlanSchema),
    mode: 'onChange',
    defaultValues: { name: '', amountNaira: '', interval: 'month', intervalCount: 1, trialDays: 0 },
  });

  useEffect(() => {
    if (!plan) return;
    setCached(plan);
    reset({
      name: plan.name,
      amountNaira: Number(plan.amount_minor) / 100,
      interval: plan.interval as BillingInterval,
      intervalCount: plan.interval_count,
      trialDays: plan.trial_period_days,
    });
  }, [plan, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!cached) return;
    try {
      await updatePlan.mutateAsync({
        id: cached.id,
        data: {
          name: values.name,
          amount_minor: Math.round(values.amountNaira * 100),
          billing_interval: values.interval,
          billing_interval_count: values.intervalCount,
          trial_period_days: values.trialDays,
        },
      });
      onClose();
    } catch {
      // surfaced via updatePlan.isError/.error below
    }
  });

  return (
    <Modal
      open={open}
      title="Edit plan"
      subtitle="Changes apply to future billing; existing subscriptions keep their current period until renewal."
      icon={<Plus size={20} className="text-jade-deep" />}
      onClose={onClose}
    >
      {cached && (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Name" id="edit-plan-name">
            <Input id="edit-plan-name" {...register('name')} autoFocus />
          </Field>
          <Field label="Amount (₦)" hint="What each customer is charged every billing cycle, in naira. Stored internally in kobo." id="edit-plan-amount">
            <Input id="edit-plan-amount" type="number" min="0" step="0.01" {...register('amountNaira')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billing interval" hint="How often the customer is charged — daily, weekly, monthly, or yearly." id="edit-plan-interval">
              <Select id="edit-plan-interval" {...register('interval')}>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </Select>
            </Field>
            <Field label="Interval count" hint="Multiplies the interval. e.g. interval Month × count 3 = billed once every 3 months. Leave at 1 for a standard cycle." id="edit-plan-interval-count">
              <Input id="edit-plan-interval-count" type="number" min="1" step="1" {...register('intervalCount')} />
            </Field>
          </div>
          <Field label="Trial period (days)" hint="Free days before the first charge. The subscription stays in 'trialing' until it converts. 0 = charge immediately." id="edit-plan-trial-days">
            <Input id="edit-plan-trial-days" type="number" min="0" step="1" {...register('trialDays')} />
          </Field>
          {updatePlan.isError && (
            <p className="text-xs text-danger">
              {updatePlan.error instanceof Error ? updatePlan.error.message : 'Failed to update plan'}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!isValid || updatePlan.isPending}>
              {updatePlan.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
