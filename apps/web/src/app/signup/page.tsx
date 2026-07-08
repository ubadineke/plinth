'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { CheckCircle, ArrowLeft, Clock, Mail, FileText } from 'lucide-react';
import { useSubmitApplication } from '@/lib/queries/auth';
import { signupSchema, type SignupFormValues } from '@/lib/schemas/auth';

type Step = 'form' | 'submitted';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('form');
  const [submitted, setSubmitted] = useState<{ businessName: string; email: string } | null>(null);
  const submitApplication = useSubmitApplication();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      businessName: '', contactName: '', email: '', rcNumber: '', website: '', description: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await submitApplication.mutateAsync({
        businessName: values.businessName,
        contactName:  values.contactName,
        email:        values.email,
        rcNumber:     values.rcNumber || undefined,
        website:      values.website || undefined,
        description:  values.description,
      });
      setSubmitted({ businessName: values.businessName, email: values.email });
      setStep('submitted');
    } catch {
      // surfaced via submitApplication.isError/.error below
    }
  });

  if (step === 'submitted' && submitted) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-jade-tint flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-jade-deep" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Application received</h1>
            <p className="mt-2 text-sm text-mid">
              We'll review <strong>{submitted.businessName}</strong>'s application and get back to you at{' '}
              <strong>{submitted.email}</strong> within 1–2 business days.
            </p>
          </div>
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-jade-tint flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-jade-deep">1</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-ink">Application review</p>
                  <p className="text-xs text-mid">Our team reviews your business details and intended use case.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-jade-tint flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-jade-deep">2</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-ink">Account provisioning</p>
                  <p className="text-xs text-mid">We create your Plinth workspace and link it to Nomba payment infrastructure.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-jade-tint flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-jade-deep">3</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-ink">You get your API key</p>
                  <p className="text-xs text-mid">We'll email you a live API key and dashboard link. Start billing in minutes.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="text-sm text-jade-deep hover:underline">← Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top bar */}
      <div className="border-b border-line bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/plinth-logo.png" alt="Plinth" width={22} height={22} />
          <span className="text-sm font-semibold text-ink">Plinth</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs text-mid hover:text-ink">
            Already have an account? Sign in
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">Apply for access</h1>
          <p className="mt-2 text-sm text-mid">
            Plinth is subscription billing infrastructure for Nigerian SaaS businesses. Tell us about what you're building and we'll get you set up.
          </p>
        </div>

        {/* Three value props */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: <Clock size={14} />, label: 'Review in 1–2 days' },
            { icon: <Mail size={14} />, label: 'API key by email' },
            { icon: <FileText size={14} />, label: 'No card required' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl bg-card border border-line p-3 text-center">
              <span className="text-jade-deep">{icon}</span>
              <span className="text-xs text-mid font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="signup-business-name" className="block text-xs font-medium text-body mb-1.5">
                    Business name <span className="text-danger">*</span>
                  </label>
                  <Input
                    id="signup-business-name"
                    placeholder="Acme Technologies Ltd"
                    {...register('businessName')}
                    className={errors.businessName ? 'border-danger/40 focus:ring-danger/30' : ''}
                  />
                  {errors.businessName && <p className="text-xs text-danger mt-1">{errors.businessName.message}</p>}
                </div>
                <div>
                  <label htmlFor="signup-contact-name" className="block text-xs font-medium text-body mb-1.5">
                    Your name <span className="text-danger">*</span>
                  </label>
                  <Input
                    id="signup-contact-name"
                    placeholder="Tunde Ogunyemi"
                    {...register('contactName')}
                    className={errors.contactName ? 'border-danger/40 focus:ring-danger/30' : ''}
                  />
                  {errors.contactName && <p className="text-xs text-danger mt-1">{errors.contactName.message}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-medium text-body mb-1.5">
                  Business email <span className="text-danger">*</span>
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="billing@acme.ng"
                  {...register('email')}
                  className={errors.email ? 'border-danger/40 focus:ring-danger/30' : ''}
                />
                {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="signup-rc-number" className="block text-xs font-medium text-body mb-1.5">
                    RC number <span className="text-faint font-normal">(optional)</span>
                  </label>
                  <Input
                    id="signup-rc-number"
                    placeholder="RC-1234567"
                    {...register('rcNumber')}
                  />
                </div>
                <div>
                  <label htmlFor="signup-website" className="block text-xs font-medium text-body mb-1.5">
                    Website <span className="text-faint font-normal">(optional)</span>
                  </label>
                  <Input
                    id="signup-website"
                    placeholder="https://acme.ng"
                    {...register('website')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-description" className="block text-xs font-medium text-body mb-1.5">
                  What are you building? <span className="text-danger">*</span>
                </label>
                <textarea
                  id="signup-description"
                  rows={4}
                  placeholder="Describe your product and how you plan to use subscription billing. E.g. 'We're building an HR SaaS for SMEs and need monthly billing for our Pro and Enterprise plans.'"
                  {...register('description')}
                  className={[
                    'w-full rounded-lg border px-3 py-2 text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-jade/25 resize-none',
                    'bg-card text-ink border-line',
                    errors.description ? 'border-danger/40 focus:ring-danger/30' : '',
                  ].join(' ')}
                />
                {errors.description && <p className="text-xs text-danger mt-1">{errors.description.message}</p>}
              </div>

              {submitApplication.isError && (
                <p className="text-xs text-danger">
                  {submitApplication.error instanceof Error ? submitApplication.error.message : 'Something went wrong. Please try again.'}
                </p>
              )}

              <div className="pt-1">
                <Button type="submit" className="w-full" disabled={submitApplication.isPending}>
                  {submitApplication.isPending ? 'Submitting…' : 'Submit application →'}
                </Button>
                <p className="text-xs text-center text-faint mt-3">
                  By submitting, you agree to Plinth's{' '}
                  <span className="underline cursor-pointer">terms of service</span> and{' '}
                  <span className="underline cursor-pointer">privacy policy</span>.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-faint mt-6">
          <Link href="/dashboard" className="flex items-center justify-center gap-1 hover:text-mid">
            <ArrowLeft size={12} /> Already approved? Sign in to your dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
