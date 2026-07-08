'use client';
import { Fragment, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices } from '@/lib/queries/invoices';
import { useCustomers } from '@/lib/queries/customers';
import { useSuspenseItems, useResolveSuspenseItem } from '@/lib/queries/suspense';
import { resolveSuspenseSchema, type ResolveSuspenseFormValues } from '@/lib/schemas/suspense';
import { formatKobo, formatDate } from '@/lib/utils';
import { AlertTriangle, CheckCircle, ArrowDownLeft } from 'lucide-react';

export default function TransfersPage() {
  const [resolveId, setResolveId] = useState<string | null>(null);

  const invoicesQuery = useInvoices();
  const suspenseQuery = useSuspenseItems();
  const customersQuery = useCustomers();
  const resolveSuspenseItem = useResolveSuspenseItem();

  const invoices = (invoicesQuery.data?.data ?? []).filter((i) => i.state === 'paid');
  const suspenseItems = suspenseQuery.data?.data ?? [];
  const customerNames: Record<string, string> = {};
  for (const c of customersQuery.data?.data ?? []) customerNames[c.id] = c.name;

  // Original code waited for all three (best-effort via Promise.allSettled)
  // before showing either table.
  const loading = invoicesQuery.isPending || suspenseQuery.isPending || customersQuery.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResolveSuspenseFormValues>({
    resolver: zodResolver(resolveSuspenseSchema),
    defaultValues: { note: '' },
  });

  useEffect(() => {
    reset({ note: '' });
  }, [resolveId, reset]);

  async function handleResolve(id: string) {
    await handleSubmit(async (values) => {
      try {
        await resolveSuspenseItem.mutateAsync({ id, note: values.note });
        setResolveId(null);
      } catch {
        // surfaced via resolveSuspenseItem.isError/.error below
      }
    })();
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
                {Array.from({ length: 4 }).map((_, i) => (
                  <Tr key={i}>
                    <Td><Skeleton className="h-3.5 w-20" /></Td>
                    <Td><Skeleton className="h-4 w-28" /></Td>
                    <Td><Skeleton className="h-3.5 w-20" /></Td>
                    <Td><Skeleton className="h-4 w-20 ml-auto" /></Td>
                    <Td><Skeleton className="h-4 w-14 ml-auto" /></Td>
                    <Td><Skeleton className="h-5 w-14 rounded-full" /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
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

          {loading ? (
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
                {Array.from({ length: 4 }).map((_, i) => (
                  <Tr key={i}>
                    <Td><Skeleton className="h-3.5 w-20" /></Td>
                    <Td><Skeleton className="h-3.5 w-28" /></Td>
                    <Td><Skeleton className="h-4 w-16 ml-auto" /></Td>
                    <Td><Skeleton className="h-3.5 w-40" /></Td>
                    <Td><Skeleton className="h-3.5 w-24" /></Td>
                    <Td><Skeleton className="h-7 w-16 rounded-lg" /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : suspenseItems.length === 0 ? (
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
                  <Fragment key={item.id}>
                    <Tr>
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
                      <tr>
                        <td colSpan={6} className="px-4 pb-4 bg-soft">
                          <div className="flex items-start gap-3 pt-3">
                            <div className="flex-1">
                              <Input
                                placeholder="Add resolution note…"
                                {...register('note')}
                                className="w-full"
                              />
                              {errors.note && <p className="text-xs text-danger mt-1">{errors.note.message}</p>}
                              {resolveSuspenseItem.isError && (
                                <p className="text-xs text-danger mt-1">
                                  {resolveSuspenseItem.error instanceof Error ? resolveSuspenseItem.error.message : 'Failed to resolve'}
                                </p>
                              )}
                            </div>
                            <Button size="sm" disabled={resolveSuspenseItem.isPending} onClick={() => handleResolve(item.id)}>
                              {resolveSuspenseItem.isPending ? 'Confirming…' : 'Confirm'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setResolveId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
