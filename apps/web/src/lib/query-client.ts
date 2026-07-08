import { QueryClient } from '@tanstack/react-query';

/* Nothing in the old hand-rolled fetch code ever retried or refetched on
   window focus — matching that here keeps this migration a pure data-layer
   swap, not a behavior change. staleTime dedupes the same list (e.g.
   customers.list()) being requested from several pages within one session. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
