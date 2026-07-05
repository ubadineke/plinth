'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { CheckCircle, ArrowLeft, Clock, Mail, FileText } from 'lucide-react';
import { api } from '@/lib/api';

type Step = 'form' | 'submitted';

interface FormData {
  businessName: string;
  contactName: string;
  email: string;
  rcNumber: string;
  website: string;
  description: string;
}

const EMPTY: FormData = {
  businessName: '',
  contactName: '',
  email: '',
  rcNumber: '',
  website: '',
  description: '',
};

export default function SignupPage() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setErrors((e_) => ({ ...e_, [field]: '' }));
    };
  }

  function validate(): boolean {
    const errs: Partial<FormData> = {};
    if (!form.businessName.trim()) errs.businessName = 'Required';
    if (!form.contactName.trim()) errs.contactName = 'Required';
    if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Valid email required';
    if (!form.description.trim() || form.description.trim().length < 20)
      errs.description = 'Tell us a bit more (at least 20 characters)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.applications.submit({
        businessName: form.businessName,
        contactName:  form.contactName,
        email:        form.email,
        rcNumber:     form.rcNumber || undefined,
        website:      form.website || undefined,
        description:  form.description,
      });
      setStep('submitted');
    } catch {
      setErrors({ email: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  if (step === 'submitted') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-jade-tint flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-jade-deep" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">Application received</h1>
            <p className="mt-2 text-sm text-mid">
              We'll review <strong>{form.businessName}</strong>'s application and get back to you at{' '}
              <strong>{form.email}</strong> within 1–2 business days.
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
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">
                    Business name <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="Acme Technologies Ltd"
                    value={form.businessName}
                    onChange={set('businessName')}
                    className={errors.businessName ? 'border-danger/40 focus:ring-danger/30' : ''}
                  />
                  {errors.businessName && <p className="text-xs text-danger mt-1">{errors.businessName}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">
                    Your name <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="Tunde Ogunyemi"
                    value={form.contactName}
                    onChange={set('contactName')}
                    className={errors.contactName ? 'border-danger/40 focus:ring-danger/30' : ''}
                  />
                  {errors.contactName && <p className="text-xs text-danger mt-1">{errors.contactName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">
                  Business email <span className="text-danger">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="billing@acme.ng"
                  value={form.email}
                  onChange={set('email')}
                  className={errors.email ? 'border-danger/40 focus:ring-danger/30' : ''}
                />
                {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">
                    RC number <span className="text-faint font-normal">(optional)</span>
                  </label>
                  <Input
                    placeholder="RC-1234567"
                    value={form.rcNumber}
                    onChange={set('rcNumber')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-body mb-1.5">
                    Website <span className="text-faint font-normal">(optional)</span>
                  </label>
                  <Input
                    placeholder="https://acme.ng"
                    value={form.website}
                    onChange={set('website')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-body mb-1.5">
                  What are you building? <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe your product and how you plan to use subscription billing. E.g. 'We're building an HR SaaS for SMEs and need monthly billing for our Pro and Enterprise plans.'"
                  value={form.description}
                  onChange={set('description')}
                  className={[
                    'w-full rounded-lg border px-3 py-2 text-sm placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-jade/25 resize-none',
                    'bg-card text-ink border-line',
                    
                    errors.description ? 'border-danger/40 focus:ring-danger/30' : '',
                  ].join(' ')}
                />
                {errors.description && <p className="text-xs text-danger mt-1">{errors.description}</p>}
              </div>

              <div className="pt-1">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Submitting…' : 'Submit application →'}
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
