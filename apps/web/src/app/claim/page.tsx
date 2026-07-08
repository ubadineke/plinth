'use client';
import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClaimToken } from '@/lib/queries/auth';

function ClaimContent() {
  const router = useRouter();
  const params = useSearchParams();
  const isLogin = params.get('mode') === 'login';
  const token = params.get('token');

  const claimToken = useClaimToken();
  // .mutate is stable (useMutation memoizes it against the observer, not the
  // per-render result object), so it's safe in this effect's deps without
  // the whole (unstable) mutation object re-triggering it on every render.
  const { mutate: claim } = claimToken;
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || !token) return;
    firedRef.current = true;
    claim(token, {
      onSuccess: (res) => {
        localStorage.setItem('nomba_api_key', res.api_key);
        localStorage.setItem('nomba_tenant_id', res.tenant_id);
        setTimeout(() => router.push('/dashboard'), 1500);
      },
    });
  }, [token, claim, router]);

  const state: 'loading' | 'success' | 'error' =
    !token ? 'error' : claimToken.isSuccess ? 'success' : claimToken.isError ? 'error' : 'loading';
  const errorMessage = !token
    ? 'No claim token found in this link.'
    : claimToken.error instanceof Error ? claimToken.error.message : 'This link is invalid or has already been used.';

  return (
    <>
      {state === 'loading' && (
        <>
          <Loader2 size={36} className="mx-auto text-indigo-500 animate-spin" />
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {isLogin ? 'Signing you in…' : 'Claiming your account…'}
          </p>
        </>
      )}

      {state === 'success' && (
        <>
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
            <CheckCircle size={28} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            {isLogin ? 'Welcome back!' : 'Account claimed!'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Taking you to your dashboard…</p>
        </>
      )}

      {state === 'error' && (
        <>
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto">
            <XCircle size={28} className="text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Link invalid</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{errorMessage}</p>
          <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
            Request a new link →
          </Button>
        </>
      )}
    </>
  );
}

export default function ClaimPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-5">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Plinth</span>
        </div>

        <Suspense fallback={<Loader2 size={36} className="mx-auto text-indigo-500 animate-spin" />}>
          <ClaimContent />
        </Suspense>
      </div>
    </div>
  );
}
