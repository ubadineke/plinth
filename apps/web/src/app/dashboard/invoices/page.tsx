'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices } from '@/lib/queries/invoices';
import { useCustomers } from '@/lib/queries/customers';
import { formatKobo, formatDate } from '@/lib/utils';
import { Download } from 'lucide-react';

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
  const invoicesQuery = useInvoices();
  const customersQuery = useCustomers();

  const invoices = invoicesQuery.data?.data ?? [];
  const customerNames: Record<string, string> = {};
  for (const c of customersQuery.data?.data ?? []) customerNames[c.id] = c.name;

  // Original code waited for the (best-effort) customer names fetch too
  // before showing the table, so names are populated on first paint.
  const isLoading = invoicesQuery.isPending || customersQuery.isPending;
  const error = invoicesQuery.error instanceof Error ? invoicesQuery.error.message : null;

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

        {error && (
          <Card className="p-4 border-danger/30">
            <p className="text-sm text-danger">{error ?? 'Failed to load invoices'}</p>
          </Card>
        )}

        <Card>
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
              {isLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Tr key={i}>
                      <Td><Skeleton className="h-3.5 w-24" /></Td>
                      <Td><Skeleton className="h-4 w-28" /></Td>
                      <Td><Skeleton className="h-4 w-16 ml-auto" /></Td>
                      <Td><Skeleton className="h-5 w-14 rounded-full" /></Td>
                      <Td><Skeleton className="h-3.5 w-32" /></Td>
                      <Td><Skeleton className="h-5 w-14 rounded-full" /></Td>
                      <Td><Skeleton className="h-3.5 w-20" /></Td>
                      <Td><Skeleton className="h-3.5 w-20" /></Td>
                    </Tr>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <Td className="text-center text-faint py-8" colSpan={8}>
                    No invoices in this state
                  </Td>
                </tr>
              ) : (
                filtered.map((inv, i) => (
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
                ))
              )}
            </Tbody>
          </Table>
        </Card>

        {!isLoading && !error && (
          <p className="text-xs text-faint">
            {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
