import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/types';

export type AppStatus = 'pending' | 'approved' | 'rejected';

export interface Application {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  rcNumber: string | null;
  website: string | null;
  description: string;
  status: AppStatus;
  nombaSubAccountId: string | null;
  tenantId: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const adminApplicationKeys = {
  all: ['admin-applications'] as const,
  lists: () => [...adminApplicationKeys.all, 'list'] as const,
};

export function useAdminApplications() {
  return useQuery({
    queryKey: adminApplicationKeys.lists(),
    queryFn: () => api.adminApplications.list() as Promise<ListResponse<Application>>,
  });
}

export interface ApproveApplicationResult {
  tenantId: string;
}

/* Same non-persisting-mock situation as API keys: approve()/reject() never
   change what list() returns afterward, so splice the result into the
   cache directly instead of invalidating. */
export function useApproveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, subAccountId }: { id: string; subAccountId: string }) =>
      api.adminApplications.approve(id, subAccountId) as Promise<ApproveApplicationResult>,
    onSuccess: (result, { id, subAccountId }) => {
      queryClient.setQueryData<ListResponse<Application>>(adminApplicationKeys.lists(), (old) => ({
        object: old?.object,
        data: (old?.data ?? []).map((a) =>
          a.id === id
            ? { ...a, status: 'approved' as const, nombaSubAccountId: subAccountId, tenantId: result.tenantId, reviewedAt: new Date().toISOString() }
            : a,
        ),
      }));
    },
  });
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.adminApplications.reject(id, reason),
    onSuccess: (_data, { id, reason }) => {
      queryClient.setQueryData<ListResponse<Application>>(adminApplicationKeys.lists(), (old) => ({
        object: old?.object,
        data: (old?.data ?? []).map((a) =>
          a.id === id
            ? { ...a, status: 'rejected' as const, rejectionReason: reason, reviewedAt: new Date().toISOString() }
            : a,
        ),
      }));
    },
  });
}
