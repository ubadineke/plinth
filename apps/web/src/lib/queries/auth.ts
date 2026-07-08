import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ClaimResult {
  tenant_id: string;
  api_key: string;
}

export function useClaimToken() {
  return useMutation({
    mutationFn: (token: string) => api.auth.claim(token) as Promise<ClaimResult>,
  });
}

export function useMagicLink() {
  return useMutation({
    mutationFn: (email: string) => api.auth.magicLink(email),
  });
}

export interface SubmitApplicationInput {
  businessName: string;
  contactName: string;
  email: string;
  rcNumber?: string;
  website?: string;
  description: string;
}

export function useSubmitApplication() {
  return useMutation({
    mutationFn: (data: SubmitApplicationInput) => api.applications.submit(data),
  });
}
