'use client';
import { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatKobo, formatDate } from '@/lib/utils';
import { AlertTriangle, CheckCircle, ArrowDownLeft } from 'lucide-react';

interface Invoice {
  id: string;
  customer_id: string;
  subscription_id: string;
  state: string;
  amount_due: string;
  amount_paid: string;
  closed_at: string | null;
  created_at: string;
}

interface SuspenseItem {
  id: string;
  tenant_id: string;
  amount_minor: string;
  account_ref: string;
  narration: string;
  reason: string;
  created_at: string;
}

interface CustomerMap { [id: string]: string }

export default function TransfersPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suspenseItems, setSuspenseItems] = useState<SuspenseItem[]>([]);
  const [customerNames, setCustomerNames] = useState<CustomerMap>({});
  const [loading, setLoading] = useState(true);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [invRes, suspRes, custRes] = await Promise.allSettled([
          api.invoices.list() as Promise<{ data: Invoice[] }>,
          api.suspense.list() as Promise<{ data: SuspenseItem[] }>,
          api.customers.list() as Promise<{ data: { id: string; name: string }[] }>,
        ]);
        if (cancelled) return;

        const paidInvoices = invRes.status === 'fulfilled'
          ? (invRes.value.data ?? []).filter((i) => i.state === 'paid')
          : [];
        setInvoices(paidInvoices);

        if (suspRes.status === 'fulfilled') setSuspenseItems(suspRes.value.data ?? []);

        if (custRes.status === 'fulfilled') {
          const map: CustomerMap = {};
          for (const c of custRes.value.data ?? []) map[c.id] = c.name;
          setCustomerNames(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleResolve(id: string) {
    if (!resolveNote.trim()) return;
    try {
      await api.suspense.resolve(id, resolveNote);
      setSuspenseItems((prev) => prev.filter((s) => s.id !== id));
      setResolveId(null);
      setResolveNote('');
    } catch {
      alert('Failed to resolve — check console');
    }
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Payment Inflows" subtitle="Settled payments & reconciliation" />

      <div className="p-6 space-y-6">
        {/* Recent Inflows */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={14} className="text-jade" />
              <CardTitle>Settled Payments</CardTitle>
            </div>
          </CardHeader>
          {loading ? (
            <CardContent>
              <p className="text-sm text-faint py-8 text-center">Loading…</p>
            </CardContent>
          ) : invoices.length === 0 ? (
            <CardContent>
              <p className="text-sm text-faint py-8 text-center">No settled payments yet</p>
            </CardContent>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Invoice</Th>
                  <Th className="text-right">Amount (Tenant)</Th>
                  <Th className="text-right">Plinth Fee (0.5%)</Th>
                  <Th>State</Th>
                </tr>
              </Thead>
              <Tbody>
                {invoices.map((inv) => {
                  const amount = Number(inv.amount_paid || inv.amount_due);
                  const plinthCut = Math.round(amount * 0.005);
                  const tenantNet = amount - plinthCut;
                  return (
                    <Tr key={inv.id}>
                      <Td className="text-mid">
                        {inv.closed_at ? formatDate(inv.closed_at) : formatDate(inv.created_at)}
                      </Td>
                      <Td className="font-medium text-ink">
                        {customerNames[inv.customer_id] ?? (
                          <span className="font-mono text-xs text-mid">{inv.customer_id}</span>
                        )}
                      </Td>
                      <Td>
                        <span className="font-mono text-xs text-mid">{inv.id}</span>
                      </Td>
                      <Td className="text-right font-mono text-[13px] font-medium text-ink">
                        {formatKobo(tenantNet)}
                      </Td>
                      <Td className="text-right font-mono text-[13px] font-medium text-jade-deep">
                        {formatKobo(plinthCut)}
                      </Td>
                      <Td><Badge status={inv.state} label={inv.state} /></Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}
        </Card>

        {/* Suspense Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {suspenseItems.length > 0 ? (
                <AlertTriangle size={14} className="text-warn" />
              ) : (
                <CheckCircle size={14} className="text-jade" />
              )}
              <CardTitle>
                {suspenseItems.length > 0
                  ? `Suspense Queue — ${suspenseItems.length} unresolved transfer${suspenseItems.length !== 1 ? 's' : ''}`
                  : 'Suspense Queue — All clear'}
              </CardTitle>
            </div>
            {suspenseItems.length > 0 && (
              <p className="text-xs text-warn mt-1">
                Payments received but not matched to an invoice — review and resolve manually
              </p>
            )}
          </CardHeader>

          {suspenseItems.length === 0 ? (
            <CardContent>
              <div className="py-8 text-center">
                <CheckCircle size={24} className="text-jade mx-auto mb-2" />
                <p className="text-sm text-faint">No items in suspense</p>
              </div>
            </CardContent>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Account Ref</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Narration</Th>
                  <Th>Reason</Th>
                  <Th>Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {suspenseItems.map((item) => (
                  <>
                    <Tr key={item.id}>
                      <Td className="text-mid">{formatDate(item.created_at)}</Td>
                      <Td className="font-mono text-xs text-mid">{item.account_ref}</Td>
                      <Td className="text-right font-mono text-[13px] font-medium text-ink">{formatKobo(Number(item.amount_minor))}</Td>
                      <Td className="text-mid text-xs">{item.narration}</Td>
                      <Td>
                        <span className="label-mono text-warn bg-warn-tint px-2 py-0.5 rounded-full">
                          {item.reason}
                        </span>
                      </Td>
                      <Td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResolveId(resolveId === item.id ? null : item.id)}
                        >
                          Resolve
                        </Button>
                      </Td>
                    </Tr>
                    {resolveId === item.id && (
                      <tr key={`${item.id}-form`}>
                        <td colSpan={6} className="px-4 pb-4 bg-soft">
                          <div className="flex items-center gap-3 pt-3">
                            <Input
                              placeholder="Add resolution note…"
                              value={resolveNote}
                              onChange={(e) => setResolveNote(e.target.value)}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={() => handleResolve(item.id)}>
                              Confirm
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setResolveId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
