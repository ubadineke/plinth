'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { useCustomers, useCreateCustomer } from '@/lib/queries/customers';
import { customerFormSchema, type CustomerFormValues } from '@/lib/schemas/customer';
import { formatKobo, formatDate } from '@/lib/utils';
import { Plus } from 'lucide-react';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function CustomersPage() {
  const { data, isPending, error } = useCustomers();
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
              {isPending ? (
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
        {!isPending && (
          <p className="text-xs text-faint">
            {customers.length} customer{customers.length === 1 ? '' : 's'} total
          </p>
        )}
      </div>

      <AddCustomerModal open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}

function AddCustomerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createCustomer = useCreateCustomer();
  // useMutation() returns a brand-new object every render (it spreads a
  // fresh { ...result, mutate, mutateAsync } each time), so it can never sit
  // in a dependency array without re-running the effect on every keystroke.
  // Track the latest one in a ref instead.
  const createCustomerRef = useRef(createCustomer);
  createCustomerRef.current = createCustomer;

  const [externalRefTouched, setExternalRefTouched] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', externalRef: '', phone: '' },
  });

  useEffect(() => {
    if (!open) return;
    reset({ name: '', email: '', externalRef: '', phone: '' });
    setExternalRefTouched(false);
    createCustomerRef.current.reset();
  }, [open, reset]);

  const name = useWatch({ control, name: 'name' });
  const email = useWatch({ control, name: 'email' });

  // Suggest an external_ref from the email/name until the user edits it.
  useEffect(() => {
    if (externalRefTouched) return;
    const suggestion = email?.includes('@') ? email.split('@')[0] : slugify(name ?? '');
    setValue('externalRef', suggestion, { shouldValidate: false });
  }, [email, name, externalRefTouched, setValue]);

  const externalRefField = register('externalRef');

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createCustomer.mutateAsync({
        external_ref: values.externalRef.trim(),
        name: values.name.trim(),
        email: values.email.trim(),
        ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
      });
      onClose();
    } catch {
      // surfaced via createCustomer.isError/.error below
    }
  });

  return (
    <Modal open={open} title="New customer" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-customer-name" className="block text-xs font-medium text-mid mb-1">Name</label>
          <Input id="new-customer-name" {...register('name')} placeholder="Acme Inc." />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="new-customer-email" className="block text-xs font-medium text-mid mb-1">Email</label>
          <Input id="new-customer-email" type="email" {...register('email')} placeholder="billing@acme.com" />
          {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="new-customer-external-ref" className="block text-xs font-medium text-mid mb-1">External Ref</label>
          <Input
            id="new-customer-external-ref"
            {...externalRefField}
            onChange={(e) => {
              setExternalRefTouched(true);
              externalRefField.onChange(e);
            }}
            placeholder="your-internal-id"
          />
          {errors.externalRef ? (
            <p className="text-xs text-danger mt-1">{errors.externalRef.message}</p>
          ) : (
            <p className="text-xs text-faint mt-1">Your merchant-side identifier for this customer.</p>
          )}
        </div>
        <div>
          <label htmlFor="new-customer-phone" className="block text-xs font-medium text-mid mb-1">Phone <span className="text-faint">(optional)</span></label>
          <Input id="new-customer-phone" {...register('phone')} placeholder="+234…" />
        </div>

        {createCustomer.isError && (
          <p className="text-sm text-danger">
            {createCustomer.error instanceof Error ? createCustomer.error.message : 'Failed to create customer'}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!isValid || createCustomer.isPending}>
            {createCustomer.isPending ? 'Creating…' : 'Create customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
