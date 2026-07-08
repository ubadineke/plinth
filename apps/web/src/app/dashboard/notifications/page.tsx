'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { MessageSquare, Mail, Search } from 'lucide-react';

interface Notification {
  id: string;
  customer_id: string;
  event_type: string | null;
  message: string | null;
  sms_to: string | null;
  sms_status: string | null;
  email_to: string | null;
  email_status: string | null;
  created_at: string;
}

interface Customer { id: string; name: string; email: string }
interface ListResponse<T> { object: 'list'; data: T[] }

const EVENT_LABEL: Record<string, string> = {
  payment_due: 'Payment due',
  past_due:    'Past due',
  delinquent:  'Delinquent',
  recovered:   'Recovered',
  activated:   'Welcome',
  receipt:     'Payment receipt',
  trial_ended: 'Trial ended',
  canceled:    'Canceled',
  reminder:    'Reminder (manual)',
};

function eventLabel(type: string | null): string {
  if (!type) return 'Notification';
  return EVENT_LABEL[type] ?? type;
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'failed', label: 'Failed' },
];

// A channel either wasn't attempted (null → nothing shown), sent, or failed.
function ChannelPill({ icon: Icon, label, status }: { icon: typeof Mail; label: string; status: string | null }) {
  if (!status) return null;
  const ok = status === 'sent';
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        ok
          ? 'bg-jade-tint text-jade-deep'
          : 'bg-danger-tint text-danger'
      }`}
      title={`${label}: ${status}`}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

export default function NotificationsPage() {
  const { data: notifData, isLoading } = useSWR('notifications', () => api.notifications.list() as Promise<ListResponse<Notification>>);
  const { data: custData } = useSWR('customers', () => api.customers.list() as Promise<ListResponse<Customer>>);

  const items: Notification[] = notifData?.data ?? [];
  const customerNames: Record<string, string> = Object.fromEntries((custData?.data ?? []).map((c) => [c.id, c.name]));

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const hasFailure = (n: Notification) => n.sms_status === 'failed' || n.email_status === 'failed';
  const isDelivered = (n: Notification) => n.sms_status === 'sent' || n.email_status === 'sent';

  const filtered = items.filter((n) => {
    if (activeTab === 'delivered' && !isDelivered(n)) return false;
    if (activeTab === 'failed' && !hasFailure(n)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (customerNames[n.customer_id] ?? n.customer_id).toLowerCase();
      const msg = (n.message ?? '').toLowerCase();
      const ev = eventLabel(n.event_type).toLowerCase();
      if (!name.includes(q) && !msg.includes(q) && !ev.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col">
      <Topbar title="Notifications" />

      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Tabs tabs={FILTER_TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="text"
              placeholder="Search customer, event, message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-line bg-card text-ink w-72 focus:outline-none focus:ring-2 focus:ring-jade/25"
            />
          </div>
        </div>

        <Card>
          {isLoading ? (
            <Table>
              <Thead>
                <tr>
                  <Th>Customer</Th><Th>Event</Th><Th>Channels</Th><Th>Message</Th><Th>Sent</Th>
                </tr>
              </Thead>
              <Tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Tr key={i}>
                    <Td><Skeleton className="h-4 w-28" /></Td>
                    <Td><Skeleton className="h-5 w-20 rounded-full" /></Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-5 w-12 rounded-full" />
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </div>
                    </Td>
                    <Td><Skeleton className="h-3.5 w-52" /></Td>
                    <Td><Skeleton className="h-3.5 w-20" /></Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare size={28} className="mx-auto text-faint/70 mb-3" />
              <p className="text-sm text-faint">No notifications yet</p>
              <p className="text-xs text-faint mt-1">Customer SMS + email sent on billing events will appear here.</p>
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Event</Th>
                  <Th>Channels</Th>
                  <Th>Message</Th>
                  <Th>Sent</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((n) => (
                  <Tr
                    key={n.id}
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                  >
                    <Td className="font-medium text-ink">
                      {customerNames[n.customer_id] ?? (
                        <span className="font-mono text-xs text-mid">{n.customer_id}</span>
                      )}
                    </Td>
                    <Td>
                      <span className="label-mono px-2 py-0.5 rounded-full bg-soft text-body">
                        {eventLabel(n.event_type)}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <ChannelPill icon={MessageSquare} label="SMS" status={n.sms_status} />
                        <ChannelPill icon={Mail} label="Email" status={n.email_status} />
                        {!n.sms_status && !n.email_status && (
                          <span className="text-xs text-faint">—</span>
                        )}
                      </div>
                    </Td>
                    <Td className="text-mid max-w-md">
                      {expanded === n.id ? (
                        <div className="space-y-1 whitespace-pre-wrap text-xs">
                          <p className="text-body">{n.message ?? '—'}</p>
                          <p className="text-faint">
                            {n.sms_to && <>SMS → {n.sms_to} ({n.sms_status}){n.email_to ? '  ·  ' : ''}</>}
                            {n.email_to && <>Email → {n.email_to} ({n.email_status})</>}
                          </p>
                        </div>
                      ) : (
                        <span className="line-clamp-1 text-xs">{n.message ?? '—'}</span>
                      )}
                    </Td>
                    <Td className="text-mid whitespace-nowrap">{formatDate(n.created_at)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>

        {!isLoading && (
          <p className="text-xs text-faint">
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''} · click a row for detail
          </p>
        )}
      </div>
    </div>
  );
}
