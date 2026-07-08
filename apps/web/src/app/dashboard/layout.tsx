'use client';
import { SWRConfig } from 'swr';
import { Sidebar } from '@/components/layout/sidebar';

// Shared SWR config for all dashboard pages:
// - 30s dedup: navigating back within 30s shows cached data instantly, no refetch
// - revalidateOnFocus: refresh when the tab regains focus (e.g. after Nomba checkout)
// - revalidateOnReconnect: refresh after offline/online transition
const SWR_CONFIG = {
  dedupingInterval: 30_000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={SWR_CONFIG}>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </SWRConfig>
  );
}
