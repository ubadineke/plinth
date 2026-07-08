'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { USE_MOCKS } from '@/lib/fixtures';
import { useMagicLink } from '@/lib/queries/auth';
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth';

type Step = 'form' | 'sent';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [sentTo, setSentTo] = useState('');
  const magicLink = useMagicLink();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  // Mock/design mode: there's no backend to authenticate against — just drop fake credentials
  // and move straight into the dashboard. Pure demo navigation, no validation.
  function handleMockSubmit(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    router.push('/dashboard');
  }

  const onSubmitReal = handleSubmit(async (values) => {
    try {
      await magicLink.mutateAsync(values.email);
      setSentTo(values.email);
      setStep('sent');
    } catch {
      // surfaced via magicLink.isError/.error below
    }
  });

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/plinth-logo.png" alt="Plinth" width={48} height={48} className="mb-4" priority />
          <h1 className="text-lg font-display font-semibold tracking-tight text-ink">Plinth</h1>
          <p className="text-sm text-mid mt-1">
            {step === 'form' ? 'Enter your email to log in' : 'Check your inbox'}
          </p>
        </div>

        <div className="bg-card border border-line rounded-xl p-6 shadow-card">
          {step === 'form' ? (
            <form onSubmit={USE_MOCKS ? handleMockSubmit : onSubmitReal} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-body mb-1.5">
                  Business email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  {...register('email')}
                  placeholder="billing@acme.ng"
                  autoFocus
                />
                {magicLink.isError && (
                  <p className="text-xs text-danger mt-1.5">
                    {magicLink.error instanceof Error ? magicLink.error.message : 'No account found for this email.'}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={magicLink.isPending || (!USE_MOCKS && !isValid)}>
                {magicLink.isPending ? 'Sending…' : USE_MOCKS ? 'Enter dashboard →' : 'Send login link →'}
              </Button>
              {USE_MOCKS && (
                <p className="text-xs text-faint text-center">Demo mode — no login required, click to continue.</p>
              )}
            </form>
          ) : (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-jade-tint flex items-center justify-center mx-auto">
                <Mail size={22} className="text-jade-deep" />
              </div>
              <p className="text-sm font-medium text-ink font-display font-semibold tracking-tight">Login link sent</p>
              <p className="text-xs text-mid">
                We sent a link to <strong>{sentTo}</strong>. Click it to log in — it expires in 7 days.
              </p>
              <button
                onClick={() => { setStep('form'); reset({ email: '' }); }}
                className="text-xs text-jade-deep hover:underline"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-faint mt-5">
          Don't have an account?{' '}
          <Link href="/signup" className="text-jade-deep hover:underline">Apply for access</Link>
        </p>
      </div>
    </div>
  );
}
