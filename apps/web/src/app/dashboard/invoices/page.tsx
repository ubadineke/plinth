'use client';
import { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatKobo, formatDate } from '@/lib/utils';
import { Download } from 'lucide-react';

interface Invoice {
  id: string;
  customer_id: string;
  subscription_id: string;
  state: string;
  currency: string;
  amount_due: string;
  amount_paid: string;
  period_start: string | null;
  period_end: string | null;
  due_at: string | null;
  billing_mode: string;
  closed_at: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface ListResponse<T> {
  object: 'list';
  data: T[];
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'paid', label: 'Paid' },
  { id: 'void', label: 'Void' },
  { id: 'uncollectible', label: 'Uncollectible' },
];

function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (start && end) return `${formatDate(start)} → ${formatDate(end)}`;
  return formatDate((start ?? end) as string);
}

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [invRes, custRes] = await Promise.all([
          api.invoices.list() as Promise<ListResponse<Invoice>>,
          (api.customers.list() as Promise<ListResponse<Customer>>).catch(() => null),
        ]);
        if (cancelled) return;
        setInvoices(invRes.data ?? []);
        if (custRes?.data) {
          const map: Record<string, string> = {};
          for (const c of custRes.data) map[c.id] = c.name;
          setCustomerNames(map);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load invoices');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = activeTab === 'all'
    ? invoices
    : invoices.filter((i) => i.state === activeTab);

  return (
    <div className="flex flex-col">
      <Topbar title="Invoices" />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Tabs tabs={FILTER_TABS} activeTab={activeTab} onChange={setActiveTab} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert('Feature coming soon')}
          >
            <Download size={14} />
            Export CSV
          </Button>
        </div>

        <Card>
          {loading ? (
            <div className="py-16 text-center">
              <p className="text-sm text-faint">Loading invoices…</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-sm text-danger">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-faint">No invoices in this state</p>
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Invoice ID</Th>
                  <Th>Customer</Th>
                  <Th className="text-right">Amount</Th>
                  <Th>Mode</Th>
                  <Th>Period</Th>
                  <Th>State</Th>
                  <Th>Due</Th>
                  <Th>Closed</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((inv, i) => (
                  <Tr key={inv.id} className="animate-row-in" style={{ animationDelay: `${Math.min(i, 12) * 28}ms` }}>
                    <Td>
                      <span className="font-mono text-xs text-mid">{inv.id}</span>
                    </Td>
                    <Td className="font-medium text-ink">
                      {customerNames[inv.customer_id] ?? (
                        <span className="font-mono text-xs text-mid">{inv.customer_id}</span>
                      )}
                    </Td>
                    <Td className="text-right font-mono text-[13px] font-medium text-ink">{formatKobo(Number(inv.amount_due))}</Td>
                    <Td>
                      <span className={`label-mono px-2 py-0.5 rounded-full ${
                        inv.billing_mode === 'advance'
                          ? 'bg-info-tint text-info'
                          : 'bg-soft text-mid'
                      }`}>
                        {inv.billing_mode}
                      </span>
                    </Td>
                    <Td className="text-mid">{formatPeriod(inv.period_start, inv.period_end)}</Td>
                    <Td><Badge status={inv.state} /></Td>
                    <Td className="text-mid">{inv.due_at ? formatDate(inv.due_at) : '—'}</Td>
                    <Td className="text-mid">{inv.closed_at ? formatDate(inv.closed_at) : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>

        {!loading && !error && (
          <p className="text-xs text-faint">
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
