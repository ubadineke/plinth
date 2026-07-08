import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.me.get() as Promise<Tenant>,
  });
}
