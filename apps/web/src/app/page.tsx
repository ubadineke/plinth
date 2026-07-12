'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// The marketing pitch lives at useplinth.xyz — its "Try Demo" button lands here.
// This root route has no landing content of its own: it just creates a live
// sandbox tenant and drops the visitor straight into the dashboard, so "Try
// Demo" is one click, not two.
export default function DemoEntry() {
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function enter() {
      try {
        const res = await api.auth.demo();
        if (cancelled) return;
        localStorage.setItem('nomba_api_key', res.api_key);
        localStorage.setItem('nomba_tenant_id', res.tenant_id);
        localStorage.removeItem('plinth_tour_dashboard_v1_done');
        window.location.href = '/dashboard';
      } catch {
        if (!cancelled) setError('Demo unavailable right now.');
      }
    }

    enter();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      {error ? (
        <div className="text-center">
          <p className="text-sm text-red-500">{error}</p>
          <a href="https://useplinth.xyz" className="mt-4 inline-block text-sm text-mid underline hover:text-ink">
            Back to useplinth.xyz
          </a>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <span className="h-6 w-6 rounded-full border-2 border-ink/15 border-t-jade animate-spin" />
          <p className="text-sm text-mid">Setting up your demo…</p>
        </div>
      )}
    </div>
  );
}
