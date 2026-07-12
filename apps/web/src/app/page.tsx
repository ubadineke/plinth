import Link from 'next/link';
import { Zap, CreditCard, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import type { Metadata } from 'next';
import { DemoButton } from '@/components/DemoButton';

export const metadata: Metadata = {
  title: 'Plinth — Billing built for Nigerian SaaS',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-semibold text-sm">Plinth</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://docs.useplinth.xyz" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors">Docs</a>
            <Link href="/login" className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Built on Nomba APIs
        </div>

        <h1 className="text-5xl font-semibold tracking-tight mb-6 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
          Subscription billing built<br />for Nigerian SaaS
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
          A complete recurring-billing engine with card charging, virtual account collection, smart dunning, and automated reconciliation — all on top of Nomba&apos;s payment infrastructure.
        </p>

        <div className="flex items-center justify-center gap-4">
          <DemoButton />
          <a
            href="https://docs.useplinth.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 px-6 py-3 rounded-xl font-medium transition-colors text-sm"
          >
            Read Docs →
          </a>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 flex items-center justify-center mb-4">
              <CreditCard size={20} className="text-indigo-400" />
            </div>
            <h3 className="font-semibold text-sm text-white mb-2">Card Billing</h3>
            <p className="text-sm text-slate-400">
              Tokenized card charging with intelligent retry logic. Handles Nigerian card declines gracefully with Nomba&apos;s payment rails.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 flex items-center justify-center mb-4">
              <ArrowLeftRight size={20} className="text-indigo-400" />
            </div>
            <h3 className="font-semibold text-sm text-white mb-2">Transfer Rail / Virtual Accounts</h3>
            <p className="text-sm text-slate-400">
              Each customer gets a dedicated VA via Nomba. Bank transfers auto-reconcile to open invoices within minutes.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-indigo-950 flex items-center justify-center mb-4">
              <AlertTriangle size={20} className="text-indigo-400" />
            </div>
            <h3 className="font-semibold text-sm text-white mb-2">Dunning & Recovery</h3>
            <p className="text-sm text-slate-400">
              Automated retry schedules, grace periods, and configurable dunning presets to recover failed payments before cancellation.
            </p>
          </div>
        </div>
      </section>

      {/* Code snippet */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-amber-500/50" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
            <span className="ml-3 text-xs text-slate-500 font-mono">3-call quickstart</span>
          </div>
          <pre className="px-6 py-6 text-sm font-mono text-slate-300 overflow-x-auto">
{`# 1. Create a customer + provision their virtual account
POST /v1/customers
{ "name": "Acme Technologies", "email": "billing@acme.ng" }

# Response includes a ready-to-use Nomba virtual account:
{ "id": "cus_01", "va": { "accountNumber": "9391234567", "bankName": "Nomba MFB" } }

# 2. Subscribe them to a plan
POST /v1/subscriptions
{ "customerId": "cus_01", "planId": "plan_pro", "rail": "transfer" }

# 3. Webhook fires on every state change
POST https://your-app.com/webhooks
{ "type": "invoice.paid", "data": { "invoiceId": "inv_01", "amount": 500000 } }`}
          </pre>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-6 py-8">
        <div className="max-w-6xl mx-auto text-center text-xs text-slate-600">
          Powered by Nomba APIs · Built for the Nomba Hackathon 2026
        </div>
      </footer>
    </div>
  );
}
