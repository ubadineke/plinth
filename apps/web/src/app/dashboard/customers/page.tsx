'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { formatKobo, formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface Customer {
  id: string;
  external_ref: string;
  name: string;
  email: string;
  phone: string | null;
  balance: string;
  created_at: string;
}

interface ListResponse {
  object?: string;
  data: Customer[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function CustomersPage() {
  const { data, isLoading, error, mutate } = useSWR('customers', () => api.customers.list() as Promise<ListResponse>);
  const customers = data?.data ?? [];
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.external_ref?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col">
      <Topbar title="Customers" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={14} />
            Add customer
          </Button>
        </div>

        {error && (
          <Card className="p-4 border-danger/30">
            <p className="text-sm text-danger">{error instanceof Error ? error.message : 'Failed to load customers'}</p>
          </Card>
        )}

        {/* Table */}
        <Card>
          <Table>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>External Ref</Th>
                <Th>Phone</Th>
                <Th className="text-right">Balance</Th>
                <Th>Created</Th>
              </tr>
            </Thead>
            <Tbody>
              {isLoading ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Tr key={i}>
                      <Td><Skeleton className="h-4 w-28" /></Td>
                      <Td><Skeleton className="h-3.5 w-40" /></Td>
                      <Td><Skeleton className="h-3.5 w-20" /></Td>
                      <Td><Skeleton className="h-3.5 w-24" /></Td>
                      <Td><Skeleton className="h-4 w-16 ml-auto" /></Td>
                      <Td><Skeleton className="h-3.5 w-20" /></Td>
                    </Tr>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <Td className="text-center text-faint py-8">
                    {customers.length === 0 ? 'No customers yet' : 'No matches'}
                  </Td>
                </tr>
              ) : (
                filtered.map((customer, i) => {
                  const balance = Number(customer.balance);
                  return (
                    <Tr key={customer.id} className="animate-row-in" style={{ animationDelay: `${Math.min(i, 12) * 28}ms` }}>
                      <Td>
                        <Link
                          href={`/dashboard/customers/${customer.id}`}
                          className="font-medium text-ink hover:text-jade-deep"
                        >
                          {customer.name}
                        </Link>
                        <p className="text-xs text-faint font-mono">{customer.id}</p>
                      </Td>
                      <Td className="text-mid">{customer.email}</Td>
                      <Td className="font-mono text-xs text-mid">{customer.external_ref}</Td>
                      <Td className="text-mid">{customer.phone || '—'}</Td>
                      <Td className="text-right">
                        {balance > 0 ? (
                          <span className="font-mono text-[13px] font-medium text-jade-deep">
                            +{formatKobo(balance)}
                          </span>
                        ) : balance < 0 ? (
                          <span className="font-mono text-[13px] font-medium text-danger">
                            {formatKobo(balance)}
                          </span>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </Td>
                      <Td className="text-mid">{formatDate(customer.created_at)}</Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Card>

        {/* Footer */}
        {!isLoading && (
          <p className="text-xs text-faint">
            {customers.length} customer{customers.length === 1 ? '' : 's'} total
          </p>
        )}
      </div>

      <AddCustomerModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onCreated={() => { setShowForm(false); mutate(); }}
      />
    </div>
  );
}

function AddCustomerModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [externalRefTouched, setExternalRefTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmail('');
    setExternalRef('');
    setExternalRefTouched(false);
    setPhone('');
    setError(null);
  }, [open]);

  // Suggest an external_ref from the email/name until the user edits it.
  useEffect(() => {
    if (externalRefTouched) return;
    const suggestion = email.includes('@') ? email.split('@')[0] : slugify(name);
    setExternalRef(suggestion);
  }, [email, name, externalRefTouched]);

  const valid =
    name.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    externalRef.trim() !== '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.customers.create({
        external_ref: externalRef.trim(),
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="New customer" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-mid mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." required />
        </div>
        <div>
          <label className="block text-xs font-medium text-mid mb-1">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="billing@acme.com" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-mid mb-1">External Ref</label>
          <Input
            value={externalRef}
            onChange={(e) => { setExternalRef(e.target.value); setExternalRefTouched(true); }}
            placeholder="your-internal-id"
            required
          />
          <p className="text-xs text-faint mt-1">Your merchant-side identifier for this customer.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-mid mb-1">Phone <span className="text-faint">(optional)</span></label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…" />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!valid || submitting}>
            {submitting ? 'Creating…' : 'Create customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
