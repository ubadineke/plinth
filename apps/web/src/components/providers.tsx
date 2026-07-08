'use client';
import { useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { createQueryClient } from '@/lib/query-client';

/* Dead in production: NODE_ENV is statically replaced at build time, so the
   dynamic import itself is eliminated from the prod bundle rather than just
   hidden behind a runtime check. */
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools), { ssr: false })
    : () => null;

/* Toasts follow the active theme and use sonner's rich semantic colors for
   success/error. Every mutation now reflects a real outcome — no more silent
   failures or fake success. */
function BrandToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{ style: { fontFamily: 'inherit', borderRadius: '10px' } }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
        <BrandToaster />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
