'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

export function DemoButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function enter() {
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.demo();
      localStorage.setItem('nomba_api_key', res.api_key);
      localStorage.setItem('nomba_tenant_id', res.tenant_id);
      localStorage.removeItem('plinth_tour_dashboard_v1_done');
      window.location.href = '/dashboard';
    } catch {
      setError('Demo unavailable right now.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={enter}
        disabled={loading}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-colors text-sm"
      >
        {loading && (
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        )}
        {loading ? 'Loading demo…' : 'Try Demo →'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
