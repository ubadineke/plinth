'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Key, Copy, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const DEMO_API_KEY = 'sk_live_a1b2c3d4e5f67890';
const DISMISS_KEY = 'plinth_quickstart_dismissed';

const STEPS = [
  {
    step: 1,
    title: 'Create a customer',
    code: `curl -X POST https://api.useplinth.com/v1/customers \\
  -H "Authorization: Bearer ${DEMO_API_KEY}" \\
  -d '{"name":"Acme Corp","email":"billing@acme.ng"}'`,
  },
  {
    step: 2,
    title: 'Subscribe them to a plan',
    code: `curl -X POST https://api.useplinth.com/v1/subscriptions \\
  -H "Authorization: Bearer ${DEMO_API_KEY}" \\
  -d '{"customer_id":"cus_...","plan_id":"pln_..."}'`,
  },
  {
    step: 3,
    title: 'Check entitlements before serving features',
    code: `curl https://api.useplinth.com/v1/customers/cus_.../entitlements \\
  -H "Authorization: Bearer ${DEMO_API_KEY}"`,
  },
];

export function QuickstartCard({ onDismiss }: { onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(DEMO_API_KEY).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, 'true');
    onDismiss();
  }

  return (
    <Card data-tour="quickstart-card" className="relative">
      <button
        onClick={dismiss}
        aria-label="Dismiss quickstart"
        className="absolute right-4 top-4 rounded-md p-1 text-faint transition-colors duration-150 hover:bg-soft hover:text-mid"
      >
        <X size={14} />
      </button>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key size={15} className="text-jade" />
          Quickstart — your first 3 API calls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg border border-line bg-soft px-4 py-3 font-mono text-[13px] text-ink">
            {DEMO_API_KEY}
          </code>
          <button
            onClick={copy}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-body transition-colors duration-150 hover:border-faint hover:text-ink"
          >
            <Copy size={12} />
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-warn">
          <AlertTriangle size={12} />
          This is a demo key for reference — keep your real key private and never commit it.
        </p>

        <div className="space-y-4 border-t border-line pt-4">
          {STEPS.map(({ step, title, code }) => (
            <div key={step} className="flex gap-4">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-jade-tint">
                <span className="font-mono text-xs font-bold text-jade-deep">{step}</span>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[13.5px] font-medium text-ink">{title}</p>
                <pre className="whitespace-pre-wrap break-all rounded-lg border border-line bg-soft p-3 font-mono text-xs text-body">
                  {code}
                </pre>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/dashboard/catalog"
          className="flex items-center gap-1 border-t border-line pt-4 text-xs font-medium text-jade-deep hover:underline"
        >
          Set up your billing catalog <ArrowRight size={10} />
        </Link>
      </CardContent>
    </Card>
  );
}

export function isQuickstartDismissed() {
  return typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === 'true';
}
