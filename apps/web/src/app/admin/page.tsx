'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { MOCK_ADMIN_TENANTS } from '@/lib/mock-data';
import { formatKobo } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function HealthDot({ status }: { status: 'ok' | 'warn' | 'error' }) {
  return (
    <span className={cn(
      'w-2 h-2 rounded-full',
      status === 'ok' ? 'bg-jade' : status === 'warn' ? 'bg-warn-bar' : 'bg-danger-bar',
    )} />
  );
}

export default function AdminPage() {
  const [selectedTenant, setSelectedTenant] = useState('ten_01');
  const [advanceSeconds, setAdvanceSeconds] = useState('');

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/plinth-logo.png" alt="" width={30} height={30} />
          <div>
            <h1 className="text-sm font-semibold text-ink">
              System Overview — Plinth
            </h1>
            <p className="text-xs text-mid">Super Admin Console</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-jade-deep hover:underline">
            ← Tenant dashboard
          </Link>
          <Link href="/admin/tenants" className="text-xs text-jade-deep hover:underline">
            Applications →
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Health indicators */}
      <Card>
        <CardHeader><CardTitle>System Health</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <HealthDot status="ok" />
              <div>
                <p className="text-xs text-mid">Queue Lag</p>
                <p className="text-sm font-semibold text-ink">0s</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HealthDot status="ok" />
              <div>
                <p className="text-xs text-mid">DLQ Items</p>
                <p className="text-sm font-semibold text-ink">0</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HealthDot status="ok" />
              <div>
                <p className="text-xs text-mid">Ledger Balance</p>
                <p className="text-sm font-semibold text-jade-deep">Balanced</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <HealthDot status="warn" />
              <div>
                <p className="text-xs text-mid">Suspense Age</p>
                <p className="text-sm font-semibold text-warn">9 days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants table */}
      <Card>
        <CardHeader><CardTitle>Tenants</CardTitle></CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Tenant</Th>
              <Th>Mode</Th>
              <Th>MRR</Th>
              <Th>Customers</Th>
              <Th>Suspense</Th>
              <Th>Queue Lag</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {MOCK_ADMIN_TENANTS.map((tenant) => (
              <Tr key={tenant.id}>
                <Td>
                  <p className="font-medium text-ink">{tenant.name}</p>
                  <p className="text-xs font-mono text-faint">{tenant.id}</p>
                </Td>
                <Td><Badge status={tenant.mode} /></Td>
                <Td className="font-mono text-[13px] text-ink">{tenant.mrr > 0 ? formatKobo(tenant.mrr) : '—'}</Td>
                <Td className="font-mono text-[13px] text-ink">{tenant.customers}</Td>
                <Td>
                  {tenant.suspense > 0 ? (
                    <span className="font-mono text-[13px] text-warn font-medium">{tenant.suspense}</span>
                  ) : (
                    <span className="font-mono text-[13px] text-faint">0</span>
                  )}
                </Td>
                <Td>
                  {tenant.queueLag > 0 ? (
                    <span className="font-mono text-[13px] text-warn font-medium">{tenant.queueLag}s</span>
                  ) : (
                    <span className="font-mono text-[13px] text-jade">0s</span>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">View</Button>
                    <Button variant="ghost" size="sm">Clock</Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>

      {/* Ledger imbalance monitor */}
      <Card>
        <CardHeader><CardTitle>Ledger Monitor</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-mid">Σ Debits</p>
              <p className="font-mono text-lg font-semibold text-ink">{formatKobo(92600000)}</p>
            </div>
            <div>
              <p className="text-xs text-mid">Σ Credits</p>
              <p className="font-mono text-lg font-semibold text-ink">{formatKobo(92600000)}</p>
            </div>
            <div>
              <p className="text-xs text-mid">Imbalance</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-lg font-semibold text-jade-deep">₦0</p>
                <CheckCircle size={16} className="text-jade" />
              </div>
            </div>
          </div>
          <p className="text-xs text-faint mt-3">Last checked: 2 minutes ago</p>
        </CardContent>
      </Card>

      {/* Clock control */}
      <Card>
        <CardHeader><CardTitle>Clock Control</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-body mb-1.5">Tenant</label>
              <Select value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)}>
                {MOCK_ADMIN_TENANTS.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                ))}
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-body mb-1.5">Advance by (seconds)</label>
              <Input
                type="number"
                placeholder="e.g. 2592000 = 30 days"
                value={advanceSeconds}
                onChange={(e) => setAdvanceSeconds(e.target.value)}
              />
            </div>
            <div className="pt-5">
              <Button disabled={!advanceSeconds}>Advance clock</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">+1 month</Button>
            <Button variant="outline" size="sm">+1 year</Button>
            <Button variant="outline" size="sm">Run tick</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
