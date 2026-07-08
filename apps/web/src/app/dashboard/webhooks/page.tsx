'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { formatRelativeDate } from '@/lib/utils';
import {
  useWebhookEndpoints,
  useWebhookDeliveries,
  useCreateWebhookEndpoint,
  useToggleWebhookEndpoint,
  useRotateWebhookSecret,
  useRemoveWebhookEndpoint,
  useResendWebhookDelivery,
} from '@/lib/queries/webhook-endpoints';
import { webhookEndpointSchema, type WebhookEndpointFormValues } from '@/lib/schemas/webhook-endpoint';
import type { WebhookEndpoint } from '@/lib/api';
import { Plus, RefreshCw, Trash2, KeyRound, ChevronDown, ChevronRight, Copy, Check, Webhook } from 'lucide-react';

const DELIVERY_STATUS: Record<string, 'delivered' | 'pending' | 'failed' | 'active'> = {
  succeeded: 'delivered', pending: 'pending', retrying: 'active', failed: 'failed',
};

export default function WebhooksPage() {
  const [adding, setAdding] = useState(false);
  const [revealed, setRevealed] = useState<{ id: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const endpointsQuery = useWebhookEndpoints();
  const endpoints = endpointsQuery.data?.data ?? [];
  const isLoading = endpointsQuery.isPending;

  const createEndpoint = useCreateWebhookEndpoint();
  const toggleEndpoint = useToggleWebhookEndpoint();
  const rotateSecret = useRotateWebhookSecret();
  const removeEndpoint = useRemoveWebhookEndpoint();
  const resendDelivery = useResendWebhookDelivery();

  const deliveriesQuery = useWebhookDeliveries(expanded ?? undefined, expanded !== null);
  const deliveries = deliveriesQuery.data ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<WebhookEndpointFormValues>({
    resolver: zodResolver(webhookEndpointSchema),
    mode: 'onChange',
    defaultValues: { url: '', description: '' },
  });

  async function submitCreate(values: WebhookEndpointFormValues) {
    try {
      const e = await createEndpoint.mutateAsync({
        url: values.url,
        ...(values.description ? { description: values.description } : {}),
      });
      if (e.secret) setRevealed({ id: e.id, secret: e.secret });
      reset({ url: '', description: '' });
      setAdding(false);
    } catch {
      // surfaced via createEndpoint.isError/.error below
    }
  }

  async function rotate(id: string) {
    const e = await rotateSecret.mutateAsync(id);
    if (e.secret) setRevealed({ id: e.id, secret: e.secret });
  }

  async function remove(id: string) {
    await removeEndpoint.mutateAsync(id);
    if (expanded === id) setExpanded(null);
  }

  function openDeliveries(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  function copySecret(secret: string) {
    navigator.clipboard?.writeText(secret);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Webhooks" subtitle="Deliver signed events to your endpoints" />

      <div className="p-6 space-y-4">
        {/* one-time secret reveal */}
        {revealed && (
          <Card className="p-4 border-jade/20 bg-jade-tint/50">
            <div className="flex items-start gap-3">
              <KeyRound size={16} className="text-jade mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">Signing secret — copy it now, it won&apos;t be shown again</p>
                <p className="text-xs text-mid mt-0.5">Verify the <code>Plinth-Signature</code> header against this secret.</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-card border border-line rounded-lg px-3 py-2 truncate">{revealed.secret}</code>
                  <Button variant="outline" size="sm" onClick={() => copySecret(revealed.secret)}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
              <button onClick={() => setRevealed(null)} className="text-xs text-faint hover:text-mid">Dismiss</button>
            </div>
          </Card>
        )}

        {/* toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-faint">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</p>
          <Button size="sm" onClick={() => setAdding((a) => !a)}><Plus size={14} /> Add endpoint</Button>
        </div>

        {/* add form */}
        {adding && (
          <Card className="p-4">
            <form onSubmit={handleSubmit(submitCreate)} className="space-y-3">
              <div>
                <label htmlFor="new-endpoint-url" className="block text-xs font-medium text-body mb-1.5">Endpoint URL</label>
                <Input id="new-endpoint-url" {...register('url')} placeholder="https://yourapp.com/api/plinth/webhook" />
              </div>
              <div>
                <label htmlFor="new-endpoint-description" className="block text-xs font-medium text-body mb-1.5">Description (optional)</label>
                <Input id="new-endpoint-description" {...register('description')} placeholder="Production consumer" />
              </div>
              {createEndpoint.isError && (
                <p className="text-xs text-danger">
                  {createEndpoint.error instanceof Error ? createEndpoint.error.message : 'Failed to create endpoint'}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={!isValid || createEndpoint.isPending}>
                  {createEndpoint.isPending ? 'Creating…' : 'Create endpoint'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* endpoints */}
        <Card className="divide-y divide-line/70">
          {isLoading ? (
            <div className="space-y-0 divide-y divide-line/70">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-4">
                  <Skeleton className="h-3.5 w-3.5 rounded-sm shrink-0" />
                  <Skeleton className="h-3.5 flex-1 max-w-xs" />
                  <Skeleton className="h-5 w-12 rounded-full ml-auto" />
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          ) : endpoints.length === 0 ? (
            <div className="py-16 text-center">
              <Webhook size={22} className="mx-auto text-faint/70" />
              <p className="mt-2 text-sm text-faint">No webhook endpoints yet.</p>
              <p className="text-xs text-faint">Add one to receive signed events.</p>
            </div>
          ) : endpoints.map((e: WebhookEndpoint) => (
            <div key={e.id}>
              <div className="px-4 py-3 flex items-center gap-3">
                <button
                  onClick={() => openDeliveries(e.id)}
                  aria-label={expanded === e.id ? 'Hide deliveries' : 'Show deliveries'}
                  className="text-faint shrink-0"
                >
                  {expanded === e.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-mono text-ink truncate block">{e.url}</code>
                  <p className="text-xs text-faint truncate">
                    {e.description || 'No description'} · {e.event_types.length === 0 ? 'all events' : `${e.event_types.length} event types`}
                  </p>
                </div>
                <Badge status={e.enabled ? 'delivered' : 'pending'} label={e.enabled ? 'enabled' : 'disabled'} />
                <Button variant="ghost" size="sm" onClick={() => toggleEndpoint.mutate({ id: e.id, enabled: !e.enabled })}>{e.enabled ? 'Disable' : 'Enable'}</Button>
                <Button variant="ghost" size="sm" onClick={() => rotate(e.id)}><KeyRound size={12} /> Rotate</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(e.id)} className="text-danger"><Trash2 size={12} /></Button>
              </div>

              {expanded === e.id && (
                <div className="px-4 pb-4 bg-soft">
                  {!deliveries ? (
                    <div className="py-3 space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-16 ml-auto" />
                          <Skeleton className="h-5 w-14 rounded-full" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 py-3">
                        {Object.entries(deliveries.counts).length === 0 && <span className="text-xs text-faint">No deliveries yet.</span>}
                        {Object.entries(deliveries.counts).map(([s, n]) => (
                          <Badge key={s} status={DELIVERY_STATUS[s] ?? 'pending'} label={`${n} ${s}`} />
                        ))}
                      </div>
                      <div className="rounded-lg border border-line bg-card divide-y divide-line/70">
                        {deliveries.data.map((d) => (
                          <div key={d.id} className="px-3 py-2 flex items-center gap-3">
                            <code className="text-xs font-mono text-jade-deep flex-1 truncate">{d.event_type}</code>
                            <span className="text-xs text-faint shrink-0">{d.response_code ?? '—'} · {d.attempts} attempt{d.attempts !== 1 ? 's' : ''}</span>
                            <Badge status={DELIVERY_STATUS[d.status] ?? 'pending'} label={d.status} />
                            <span className="text-xs text-faint whitespace-nowrap shrink-0 w-20 text-right">{formatRelativeDate(d.created_at)}</span>
                            {(d.status === 'failed' || d.status === 'retrying') && (
                              <Button variant="ghost" size="sm" onClick={() => resendDelivery.mutate({ endpointId: e.id, deliveryId: d.id })}><RefreshCw size={11} /> Resend</Button>
                            )}
                          </div>
                        ))}
                        {deliveries.data.length === 0 && <div className="px-3 py-4 text-xs text-faint text-center">No deliveries yet.</div>}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
