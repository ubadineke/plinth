import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/types';

export interface Invoice {
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

const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
};

export function useInvoices() {
  return useQuery({
    queryKey: invoiceKeys.lists(),
    queryFn: () => api.invoices.list() as Promise<ListResponse<Invoice>>,
  });
}
