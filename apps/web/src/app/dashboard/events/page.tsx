'use client';
import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOCK_EVENTS } from '@/lib/mock-data';
import { formatRelativeDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { RefreshCw, ChevronRight } from 'lucide-react';

function getEventFamilyColor(type: string): string {
  if (type.startsWith('invoice.')) return 'text-jade-deep';
  if (type.startsWith('transfer.')) return 'text-info';
  if (type.includes('past_due') || type.includes('grace')) return 'text-warn';
  if (type.includes('delinquent')) return 'text-danger';
  if (type.startsWith('subscription.')) return 'text-jade-deep';
  return 'text-mid';
}

const MOCK_PAYLOAD: Record<string, object> = {
  evt_01: { type: 'subscription.activated', data: { subscriptionId: 'sub_ada', planId: 'plan_standard', invoiceId: 'inv_01' } },
  evt_02: { type: 'invoice.paid', data: { invoiceId: 'inv_01', amount: 290000, paidAt: '2026-06-15T08:00:01Z' } },
  evt_03: { type: 'invoice.payment_due', data: { invoiceId: 'inv_03', amount: 290000, rail: 'transfer' } },
  evt_04: { type: 'subscription.past_due', data: { subscriptionId: 'sub_bola', declineCode: 'INSUFFICIENT_FUNDS', attempts: 1 } },
  evt_05: { type: 'subscription.grace', data: { subscriptionId: 'sub_emeka', gracePeriodDays: 7 } },
  evt_06: { type: 'subscription.delinquent', data: { subscriptionId: 'sub_ngozi' } },
  evt_07: { type: 'subscription.recovered', data: { subscriptionId: 'sub_chidi', attempt: 2, amount: 1200000 } },
  evt_08: { type: 'subscription.trial_ended', data: { subscriptionId: 'sub_tunde', strategy: 'activate_then_charge' } },
  evt_09: { type: 'invoice.partially_paid', data: { invoiceId: 'inv_04', amountPaid: 100000, amountDue: 1200000 } },
  evt_10: { type: 'subscription.plan_change_scheduled', data: { subscriptionId: 'sub_sch', newPlanId: 'plan_standard' } },
  evt_11: { type: 'subscription.canceled', data: { subscriptionId: 'sub_zainab', reason: 'cancel_at_period_end' } },
  evt_12: { type: 'subscription.renewed', data: { subscriptionId: 'sub_ada', planId: 'plan_standard', amount: 290000 } },
};

export default function EventsPage() {
  const [showUndelivered, setShowUndelivered] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const reduce = useReducedMotion();

  const events = showUndelivered
    ? MOCK_EVENTS.filter((e) => !e.delivered)
    : MOCK_EVENTS;

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Events" subtitle="Outbox delivery log" />

      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUndelivered(!showUndelivered)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
                showUndelivered
                  ? 'bg-warn-tint border-warn/20 text-warn'
                  : 'border-line text-mid hover:bg-soft',
              )}
            >
              {showUndelivered ? 'All events' : 'Undelivered only'}
            </button>
          </div>
          <button
            onClick={() => setLiveMode(!liveMode)}
            className={cn(
              'flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
              liveMode
                ? 'bg-jade-tint border-jade/20 text-jade-deep'
                : 'border-line text-mid',
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', liveMode ? 'bg-jade animate-pulse' : 'bg-faint')} />
            {liveMode ? 'Live' : 'Paused'}
          </button>
        </div>

        {/* Events list */}
        <Card className="divide-y divide-line/70">
          {events.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-faint">No undelivered events</p>
            </div>
          ) : (
            events.map((evt) => {
              const isExpanded = expanded.has(evt.id);
              const payload = MOCK_PAYLOAD[evt.id];
              return (
                <div key={evt.id}>
                  <div
                    className="px-4 py-3 flex items-center gap-4 hover:bg-soft/60 cursor-pointer"
                    onClick={() => toggleExpand(evt.id)}
                  >
                    <motion.span
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 25 }}
                      className="text-faint shrink-0"
                    >
                      <ChevronRight size={14} />
                    </motion.span>
                    <code className={cn('text-xs font-mono flex-1 truncate', getEventFamilyColor(evt.type))}>
                      {evt.type}
                    </code>
                    <span className="text-xs font-mono text-faint shrink-0">
                      {evt.resourceId}
                    </span>
                    <Badge
                      status={evt.delivered ? 'delivered' : 'pending'}
                      label={evt.delivered ? 'delivered' : 'pending'}
                    />
                    <span className="text-xs text-faint whitespace-nowrap shrink-0">
                      {formatRelativeDate(evt.occurredAt)}
                    </span>
                    {!evt.delivered && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); }}
                        className="shrink-0"
                      >
                        <RefreshCw size={12} />
                        Resend
                      </Button>
                    )}
                  </div>
                  <AnimatePresence initial={false}>
                    {isExpanded && payload && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={reduce ? { duration: 0 } : { type: 'spring', visualDuration: 0.3, bounce: 0.1 }}
                        className="overflow-hidden bg-soft"
                      >
                        <pre className="text-xs font-mono text-body overflow-x-auto p-3 m-4 mt-0 bg-card border border-line rounded-lg">
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </Card>

        <p className="text-xs text-faint">
          {events.length} event{events.length !== 1 ? 's' : ''}
          {showUndelivered ? ' undelivered' : ' total'}
        </p>
      </div>
    </div>
  );
}
