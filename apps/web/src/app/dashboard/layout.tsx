'use client';
import { Sidebar } from '@/components/layout/sidebar';
import { DashboardTour } from '@/components/onboarding/dashboard-tour';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <DashboardTour />
    </div>
  );
}
