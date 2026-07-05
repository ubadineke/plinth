'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Check } from 'lucide-react';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { api, type VirtualAccount } from '@/lib/api';
import { formatKobo, formatDate } from '@/lib/utils';

interface Customer {
  id: string;
  external_ref: string;
  name: string;
  email: string;
  phone: string | null;
  balance: string;
  created_at: string;
}

interface Entitlements {
  subscription_id: string | null;
  state: string | null;
  has_access: boolean;
  tier: string | null;
  features: string[] | null;
}

interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  state: string;
  quantity: number;
  current_period_end: string | null;
  next_bill_at: string | null;
}

interface NotifItem {
  id: string;
  event_type: string | null;
  message: string | null;
  sms_status: string | null;
  email_status: string | null;
  created_at: string;
}

const NOTIF_LABEL: Record<string, string> = {
  payment_due: 'Payment due', past_due: 'Past due', delinquent: 'Delinquent', recovered: 'Recovered',
  activated: 'Welcome', receipt: 'Payment receipt', trial_ended: 'Trial ended', canceled: 'Canceled',
  reminder: 'Reminder (manual)',
};

const TABS = [
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'entitlements', label: 'Entitlements' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'events', label: 'Events' },
];

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [tab, setTab] = useState('subscriptions');
  const [copied, setCopied] = useState(false);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [va, setVa] = useState<VirtualAccount | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [notifsLoaded, setNotifsLoaded] = useState(false);
  const [reminding, setReminding] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const customerData = await api.customers.get(id) as Customer;
      setCustomer(customerData);

      // These are best-effort and shouldn't block rendering the customer.
      const [ent, subList, vaRes] = await Promise.allSettled([
        api.customers.entitlements(id) as Promise<Entitlements>,
        api.subscriptions.list() as Promise<{ data: Subscription[] }>,
        api.customers.getVirtualAccount(id),
      ]);

      if (ent.status === 'fulfilled') setEntitlements(ent.value);
      if (subList.status === 'fulfilled') {
        setSubs((subList.value.data ?? []).filter((s) => s.customer_id === id));
      }
      setVa(vaRes.status === 'fulfilled' ? vaRes.value : null); // 404 → none yet
    } catch (e) {
      if (e instanceof Error && /404/.test(e.message)) {
        setNotFound(true);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load customer');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab !== 'notifications' || !id || notifsLoaded) return;
    (api.notifications.list(id) as Promise<{ data: NotifItem[] }>)
      .then((r) => { setNotifs(r.data ?? []); setNotifsLoaded(true); })
      .catch(() => {});
  }, [tab, id, notifsLoaded]);

  async function sendReminder() {
    if (!id) return;
    setReminding('sending');
    try {
      const r = await api.notifications.remind(id) as { ok?: boolean };
      setReminding(r.ok ? 'sent' : 'failed');
      setNotifsLoaded(false); // refresh history next time the tab opens
    } catch { setReminding('failed'); }
  }

  function copyId() {
    if (!customer) return;
    navigator.clipboard.writeText(customer.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function provisionVa() {
    if (!id) return;
    setProvisioning(true);
    try { setVa(await api.customers.virtualAccount(id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to provision virtual account'); }
    finally { setProvisioning(false); }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <Topbar title="Customer" />
        <div className="p-6">
          <p className="text-sm text-faint">Loading…</p>
        </div>
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="flex flex-col">
        <Topbar title="Customer" />
        <div className="p-6">
          <Card className="p-8 text-center">
            <p className="text-sm font-medium text-ink">Customer not found</p>
            <p className="text-xs text-faint mt-1">
              {error ?? 'This customer does not exist or could not be loaded.'}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const balance = Number(customer.balance);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <Topbar title={customer.name} subtitle={customer.email} />

      <div className="p-6 space-y-4">
        {error && (
          <Card className="p-4 border-danger/30">
            <p className="text-sm text-danger">{error}</p>
          </Card>
        )}

        {/* Customer header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-ink">{customer.name}</h2>
            {entitlements?.state && <Badge status={entitlements.state} />}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="space-y-4">
            {/* Customer info */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-mid">Customer ID</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-body">{customer.id}</p>
                    <button onClick={copyId} className="text-faint hover:text-jade-deep transition-colors">
                      {copied ? <Check size={14} className="text-jade" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-mid">Email</p>
                  <p className="text-sm text-body">{customer.email}</p>
                </div>
                <div>
                  <p className="text-xs text-mid">Phone</p>
                  <p className="text-sm text-body">{customer.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-mid">Reachable via</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${customer.phone ? 'bg-jade-tint text-jade-deep' : 'bg-soft text-faint'}`}>
                      SMS {customer.phone ? '✓' : '—'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${customer.email ? 'bg-jade-tint text-jade-deep' : 'bg-soft text-faint'}`}>
                      Email {customer.email ? '✓' : '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-mid">External Ref</p>
                  <p className="text-sm font-mono text-body">{customer.external_ref || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-mid">Created</p>
                  <p className="text-sm text-body">{formatDate(customer.created_at)}</p>
                </div>
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={sendReminder}
                    disabled={reminding === 'sending' || (!customer.phone && !customer.email)}
                    title="Send this customer a payment reminder by SMS + email"
                  >
                    {reminding === 'sending' ? 'Sending…'
                      : reminding === 'sent' ? '✓ Reminder sent'
                      : reminding === 'failed' ? 'Failed — retry'
                      : 'Send payment reminder'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Virtual account (transfer rail) */}
            <Card>
              <CardHeader>
                <CardTitle>Virtual account</CardTitle>
              </CardHeader>
              <CardContent>
                {va ? (
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-xs text-mid">Bank</p>
                      <p className="text-sm text-body">{va.bank_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-mid">Account number</p>
                      <p className="text-sm font-mono font-semibold text-ink tracking-wide">{va.account_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-mid">Account name</p>
                      <p className="text-sm text-body">{va.account_name}</p>
                    </div>
                    <p className="text-[11px] text-faint pt-1">Transfers here reconcile to this customer&apos;s invoices automatically.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-faint">No virtual account yet. Provision a dedicated NUBAN for this customer to pay by transfer.</p>
                    <Button size="sm" variant="outline" onClick={provisionVa} disabled={provisioning}>
                      {provisioning ? 'Provisioning…' : 'Provision virtual account'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Access card */}
            <Card>
              <CardHeader>
                <CardTitle>Access</CardTitle>
              </CardHeader>
              <CardContent>
                {entitlements ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {entitlements.has_access ? (
                        <Badge status="active" label="has access" />
                      ) : (
                        <Badge status="canceled" label="no access" />
                      )}
                      {entitlements.tier && <span className="text-xs text-mid">{entitlements.tier}</span>}
                    </div>
                    {entitlements.features && entitlements.features.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {entitlements.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-mid">
                            <Check size={12} className="text-jade shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-faint">No entitlements.</p>
                )}
              </CardContent>
            </Card>

            {/* Balance card */}
            <Card>
              <CardHeader>
                <CardTitle>Ledger Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`font-mono text-2xl font-semibold ${balance > 0 ? 'text-jade-deep' : balance < 0 ? 'text-danger' : 'text-ink'}`}>
                  {balance === 0 ? '₦0' : formatKobo(Math.abs(balance))}
                </p>
                <p className="text-xs text-faint mt-1">
                  {balance > 0 ? 'Credit balance' : balance < 0 ? 'Amount owed' : 'No outstanding balance'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-line rounded-xl overflow-hidden">
              <div className="px-4 pt-4">
                <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />
              </div>

              <div className="p-4">
                {tab === 'subscriptions' && (
                  <div>
                    {subs.length === 0 ? (
                      <p className="text-sm text-faint text-center py-8">No subscriptions</p>
                    ) : (
                      <Table>
                        <Thead>
                          <tr>
                            <Th>Subscription</Th>
                            <Th>Plan</Th>
                            <Th>Qty</Th>
                            <Th>State</Th>
                            <Th>Next Bill</Th>
                          </tr>
                        </Thead>
                        <Tbody>
                          {subs.map((sub) => (
                            <Tr key={sub.id}>
                              <Td className="font-mono text-xs">{sub.id}</Td>
                              <Td className="font-mono text-xs">{sub.plan_id}</Td>
                              <Td>{sub.quantity}</Td>
                              <Td><Badge status={sub.state} /></Td>
                              <Td className="text-mid">
                                {sub.next_bill_at ? formatDate(sub.next_bill_at) : '—'}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </div>
                )}

                {tab === 'entitlements' && (
                  <div>
                    {!entitlements ? (
                      <p className="text-sm text-faint text-center py-8">No entitlements</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-mid">Access:</span>
                          {entitlements.has_access ? (
                            <Badge status="active" label="granted" />
                          ) : (
                            <Badge status="canceled" label="denied" />
                          )}
                        </div>
                        {entitlements.state && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-mid">State:</span>
                            <Badge status={entitlements.state} />
                          </div>
                        )}
                        {entitlements.tier && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-mid">Tier:</span>
                            <span className="text-sm text-body">{entitlements.tier}</span>
                          </div>
                        )}
                        {entitlements.features && entitlements.features.length > 0 && (
                          <div>
                            <p className="text-xs text-mid mb-1">Features</p>
                            <ul className="space-y-1">
                              {entitlements.features.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-xs text-mid">
                                  <Check size={12} className="text-jade shrink-0" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'notifications' && (
                  <div>
                    {notifs.length === 0 ? (
                      <p className="text-sm text-faint text-center py-8">No notifications sent to this customer yet</p>
                    ) : (
                      <div className="space-y-2">
                        {notifs.map((n) => (
                          <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg border border-line">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs px-2 py-0.5 rounded font-medium bg-soft text-body">
                                  {NOTIF_LABEL[n.event_type ?? ''] ?? n.event_type ?? 'Notification'}
                                </span>
                                {n.sms_status && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${n.sms_status === 'sent' ? 'bg-jade-tint text-jade-deep' : 'bg-danger-tint text-danger'}`}>SMS</span>
                                )}
                                {n.email_status && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${n.email_status === 'sent' ? 'bg-jade-tint text-jade-deep' : 'bg-danger-tint text-danger'}`}>Email</span>
                                )}
                              </div>
                              <p className="text-xs text-mid line-clamp-2">{n.message ?? '—'}</p>
                            </div>
                            <span className="text-xs text-faint whitespace-nowrap shrink-0">{formatDate(n.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'ledger' && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-faint">Ledger entries will appear here</p>
                  </div>
                )}

                {tab === 'events' && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-faint">Customer events will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
