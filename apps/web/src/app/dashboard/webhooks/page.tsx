'use client';
import { useEffect, useState, useCallback } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, type WebhookEndpoint, type WebhookDelivery } from '@/lib/api';
import { formatRelativeDate } from '@/lib/utils';
import { Plus, RefreshCw, Trash2, KeyRound, ChevronDown, ChevronRight, Copy, Check, Webhook } from 'lucide-react';

const DELIVERY_STATUS: Record<string, 'delivered' | 'pending' | 'failed' | 'active'> = {
  succeeded: 'delivered', pending: 'pending', retrying: 'active', failed: 'failed',
};

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [revealed, setRevealed] = useState<{ id: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<{ counts: Record<string, number>; data: WebhookDelivery[] } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.webhookEndpoints.list().then((r) => setEndpoints(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!url.trim()) return;
    const e = await api.webhookEndpoints.create({ url: url.trim(), description: description.trim() || undefined });
    if (e.secret) setRevealed({ id: e.id, secret: e.secret });
    setUrl(''); setDescription(''); setAdding(false);
    load();
  }

  async function toggle(e: WebhookEndpoint) {
    await api.webhookEndpoints.update(e.id, { enabled: !e.enabled });
    load();
  }
  async function rotate(id: string) {
    const e = await api.webhookEndpoints.rotate(id);
    if (e.secret) setRevealed({ id: e.id, secret: e.secret });
  }
  async function remove(id: string) {
    await api.webhookEndpoints.remove(id);
    if (expanded === id) setExpanded(null);
    load();
  }
  async function openDeliveries(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id); setDeliveries(null);
    setDeliveries(await api.webhookEndpoints.deliveries(id));
  }
  async function resend(endpointId: string, deliveryId: string) {
    await api.webhookEndpoints.resend(endpointId, deliveryId);
    setDeliveries(await api.webhookEndpoints.deliveries(endpointId));
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
          <Card className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-body mb-1.5">Endpoint URL</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourapp.com/api/plinth/webhook"
                className="w-full text-sm rounded-lg border border-line bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-jade/25" />
            </div>
            <div>
              <label className="block text-xs font-medium text-body mb-1.5">Description (optional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Production consumer"
                className="w-full text-sm rounded-lg border border-line bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-jade/25" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" disabled={!url.trim()} onClick={create}>Create endpoint</Button>
            </div>
          </Card>
        )}

        {/* endpoints */}
        <Card className="divide-y divide-line/70">
          {loading ? (
            <div className="py-16 text-center text-sm text-faint">Loading…</div>
          ) : endpoints.length === 0 ? (
            <div className="py-16 text-center">
              <Webhook size={22} className="mx-auto text-faint/70" />
              <p className="mt-2 text-sm text-faint">No webhook endpoints yet.</p>
              <p className="text-xs text-faint">Add one to receive signed events.</p>
            </div>
          ) : endpoints.map((e) => (
            <div key={e.id}>
              <div className="px-4 py-3 flex items-center gap-3">
                <button onClick={() => openDeliveries(e.id)} className="text-faint shrink-0">
                  {expanded === e.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-mono text-ink truncate block">{e.url}</code>
                  <p className="text-xs text-faint truncate">
                    {e.description || 'No description'} · {e.event_types.length === 0 ? 'all events' : `${e.event_types.length} event types`}
                  </p>
                </div>
                <Badge status={e.enabled ? 'delivered' : 'pending'} label={e.enabled ? 'enabled' : 'disabled'} />
                <Button variant="ghost" size="sm" onClick={() => toggle(e)}>{e.enabled ? 'Disable' : 'Enable'}</Button>
                <Button variant="ghost" size="sm" onClick={() => rotate(e.id)}><KeyRound size={12} /> Rotate</Button>
                <Button variant="ghost" size="sm" onClick={() => remove(e.id)} className="text-danger"><Trash2 size={12} /></Button>
              </div>

              {expanded === e.id && (
                <div className="px-4 pb-4 bg-soft">
                  {!deliveries ? (
                    <p className="py-4 text-xs text-faint">Loading deliveries…</p>
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
                              <Button variant="ghost" size="sm" onClick={() => resend(e.id, d.id)}><RefreshCw size={11} /> Resend</Button>
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
