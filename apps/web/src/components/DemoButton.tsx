'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
        {loading ? <Loader2 size={15} className="animate-spin" /> : null}
        {loading ? 'Loading demo…' : 'Try Demo →'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
