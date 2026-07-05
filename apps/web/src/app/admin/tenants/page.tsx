'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table';
import { Modal, Drawer } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { X, CheckCircle, XCircle, Clock, ExternalLink, Copy, Check, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppStatus = 'pending' | 'approved' | 'rejected';
interface Application {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  rcNumber: string | null;
  website: string | null;
  description: string;
  status: AppStatus;
  nombaSubAccountId: string | null;
  tenantId: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const STATUS_TABS: { label: string; value: AppStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

function statusBadge(status: AppStatus) {
  const map: Record<AppStatus, { label: string; className: string }> = {
    pending:  { label: 'Pending',  className: 'bg-warn-tint text-warn' },
    approved: { label: 'Approved', className: 'bg-jade-tint text-jade-deep' },
    rejected: { label: 'Rejected', className: 'bg-danger-tint text-danger' },
  };
  const s = map[status];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', s.className)}>
      {s.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TEST_SUB_ACCOUNT_ID = 'f683ffd8-5ed3-41c0-bd9d-dcb1f24f0d22';

export default function AdminTenantsPage() {
  const [tab, setTab] = useState<AppStatus | 'all'>('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  // Kept around during the drawer's close animation so the body doesn't blank out mid-exit.
  const [drawerData, setDrawerData] = useState<Application | null>(null);
  useEffect(() => {
    if (selected) setDrawerData(selected);
  }, [selected]);
  const [approveMode, setApproveMode] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [subAccountId, setSubAccountId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [approvalResult, setApprovalResult] = useState<{ tenantId: string; email: string } | null>(null);
  const [cachedApprovalResult, setCachedApprovalResult] = useState<{ tenantId: string; email: string } | null>(null);
  const [copied, setCopied] = useState<'tenantId' | null>(null);

  useEffect(() => {
    if (approvalResult) setCachedApprovalResult(approvalResult);
  }, [approvalResult]);

  useEffect(() => {
    api.adminApplications.list()
      .then((res: any) => setApplications(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isSubAccountTaken = applications.some((a) => a.status === 'approved' && a.nombaSubAccountId !== null);

  const filtered = tab === 'all' ? applications : applications.filter((a) => a.status === tab);
  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  function openDrawer(app: Application) {
    setSelected(app);
    setApproveMode(false);
    setRejectMode(false);
    setSubAccountId(TEST_SUB_ACCOUNT_ID);
    setRejectReason('');
  }

  async function handleApprove() {
    if (!selected || !subAccountId.trim()) return;
    setSaving(true);
    try {
      const result = await api.adminApplications.approve(selected.id, subAccountId.trim());
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? { ...a, status: 'approved', nombaSubAccountId: subAccountId, tenantId: result.tenantId, reviewedAt: new Date().toISOString() }
            : a,
        ),
      );
      setApprovalResult({ tenantId: result.tenantId, email: selected.email });
      setSelected(null);
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!selected || !rejectReason.trim()) return;
    setSaving(true);
    try {
      await api.adminApplications.reject(selected.id, rejectReason.trim());
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? { ...a, status: 'rejected', rejectionReason: rejectReason, reviewedAt: new Date().toISOString() }
            : a,
        ),
      );
      setSelected(null);
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function copyField(field: 'tenantId', value: string) {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

      {/* Approval credentials modal */}
      <Modal
        open={!!approvalResult}
        title="Tenant approved"
        subtitle={cachedApprovalResult ? `A claim link has been sent to ${cachedApprovalResult.email}` : undefined}
        icon={<CheckCircle size={20} className="text-jade-deep" />}
        onClose={() => setApprovalResult(null)}
      >
        {cachedApprovalResult && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-mid mb-1.5">Tenant ID</p>
              <div className="flex items-center gap-2 bg-soft border border-line rounded-lg px-3 py-2.5">
                <code className="flex-1 text-xs font-mono text-ink break-all">{cachedApprovalResult.tenantId}</code>
                <button
                  onClick={() => copyField('tenantId', cachedApprovalResult.tenantId)}
                  className="shrink-0 text-faint hover:text-jade-deep transition-colors"
                >
                  {copied === 'tenantId' ? <Check size={14} className="text-jade" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-jade-deep bg-jade-tint border border-jade/20 rounded-lg px-3 py-2">
              <Mail size={13} className="shrink-0" />
              Claim link emailed to <strong>{cachedApprovalResult.email}</strong> — they'll create their API key after logging in
            </div>

            <Button onClick={() => setApprovalResult(null)} className="w-full">Done</Button>
          </div>
        )}
      </Modal>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/plinth-logo.png" alt="" width={30} height={30} />
          <div>
            <h1 className="text-sm font-semibold text-ink">Tenant Applications</h1>
            <p className="text-xs text-mid">Super Admin Console</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-xs text-jade-deep hover:underline">← System overview</Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending review', value: pendingCount, icon: <Clock size={16} className="text-warn" /> },
          { label: 'Approved', value: applications.filter((a) => a.status === 'approved').length, icon: <CheckCircle size={16} className="text-jade" /> },
          { label: 'Rejected', value: applications.filter((a) => a.status === 'rejected').length, icon: <XCircle size={16} className="text-danger" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label}>
            <CardContent className="pt-4 flex items-center gap-3">
              {icon}
              <div>
                <p className="text-xl font-bold text-ink">{value}</p>
                <p className="text-xs text-mid">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {STATUS_TABS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    tab === value
                      ? 'bg-ink text-white'
                      : 'text-mid hover:bg-soft',
                  )}
                >
                  {label}
                  {value === 'pending' && pendingCount > 0 && (
                    <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-xs', tab === 'pending' ? 'bg-white/20' : 'bg-warn-tint text-warn')}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <Table>
          <Thead>
            <tr>
              <Th>Business</Th>
              <Th>Contact</Th>
              <Th>Status</Th>
              <Th>Applied</Th>
              <Th>Nomba Sub-Account</Th>
              <Th>Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={6} className="text-center py-10 text-faint">
                  Loading…
                </Td>
              </Tr>
            ) : filtered.length === 0 ? (
              <Tr>
                <Td colSpan={6} className="text-center py-10 text-faint">
                  No applications in this category
                </Td>
              </Tr>
            ) : (
              filtered.map((app) => (
                <Tr key={app.id} className="cursor-pointer hover:bg-soft/60" onClick={() => openDrawer(app)}>
                  <Td>
                    <p className="font-medium text-ink">{app.businessName}</p>
                    <p className="text-xs text-faint">{app.email}</p>
                  </Td>
                  <Td>{app.contactName}</Td>
                  <Td>{statusBadge(app.status)}</Td>
                  <Td className="text-xs text-mid">{formatDate(app.createdAt)}</Td>
                  <Td>
                    {app.nombaSubAccountId ? (
                      <code className="text-xs font-mono text-mid bg-soft px-2 py-0.5 rounded">
                        {app.nombaSubAccountId}
                      </code>
                    ) : (
                      <span className="text-faint/70">—</span>
                    )}
                  </Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openDrawer(app)}>Review</Button>
                      {app.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { openDrawer(app); setApproveMode(true); }}
                          className="text-jade-deep border-jade/20 hover:bg-jade-tint"
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Card>

      {/* Detail drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {drawerData && (
          <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-card z-10">
              <div>
                <h2 className="font-semibold text-ink">{drawerData.businessName}</h2>
                <p className="text-xs text-mid">{drawerData.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(drawerData.status)}
                <button onClick={() => setSelected(null)} className="text-faint hover:text-mid ml-2">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer body */}
            <div className="flex-1 px-6 py-5 space-y-6">
              {/* Applicant details */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">Applicant</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Contact name', value: drawerData.contactName },
                    { label: 'Email', value: drawerData.email },
                    { label: 'RC number', value: drawerData.rcNumber ?? '—' },
                    { label: 'Website', value: drawerData.website ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-mid">{label}</p>
                      <p className="text-sm font-medium text-ink break-all">
                        {label === 'Website' && drawerData.website ? (
                          <a href={drawerData.website} target="_blank" rel="noopener noreferrer" className="text-jade-deep flex items-center gap-1 hover:underline">
                            {drawerData.website} <ExternalLink size={10} />
                          </a>
                        ) : value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Description */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">What they're building</h3>
                <p className="text-sm text-body leading-relaxed bg-soft rounded-lg px-4 py-3">
                  {drawerData.description ?? <span className="text-faint italic">No description provided</span>}
                </p>
              </section>

              {/* Timeline */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-mid">Applied</span>
                    <span className="text-ink">{formatDate(drawerData.createdAt)}</span>
                  </div>
                  {drawerData.reviewedAt && (
                    <div className="flex justify-between">
                      <span className="text-mid">Reviewed</span>
                      <span className="text-ink">{formatDate(drawerData.reviewedAt)}</span>
                    </div>
                  )}
                  {drawerData.tenantId && (
                    <div className="flex justify-between">
                      <span className="text-mid">Tenant ID</span>
                      <code className="text-xs font-mono text-ink">{drawerData.tenantId}</code>
                    </div>
                  )}
                  {drawerData.nombaSubAccountId && (
                    <div className="flex justify-between">
                      <span className="text-mid">Nomba Sub-Account</span>
                      <code className="text-xs font-mono text-ink">{drawerData.nombaSubAccountId}</code>
                    </div>
                  )}
                  {drawerData.rejectionReason && (
                    <div className="mt-2 bg-danger-tint border border-danger/20 rounded-lg px-3 py-2">
                      <p className="text-xs text-danger font-medium mb-1">Rejection reason</p>
                      <p className="text-xs text-danger">{drawerData.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Approve form */}
              {drawerData.status === 'pending' && approveMode && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">Approve</h3>
                  {isSubAccountTaken ? (
                    <div className="bg-warn-tint border border-warn/20 rounded-lg px-4 py-4 text-sm text-warn">
                      <p className="font-medium mb-1">Sub-account unavailable</p>
                      <p className="text-xs leading-relaxed">Only one Nomba sub-account is available for this build. It is currently assigned to an approved tenant and cannot be reassigned until that approval is removed.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-body mb-1.5">Nomba sub-account ID</label>
                        <Input value={subAccountId} readOnly className="font-mono text-xs bg-soft cursor-default" />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleApprove} disabled={saving} className="flex-1">
                          {saving ? 'Approving…' : 'Confirm approval →'}
                        </Button>
                        <Button variant="outline" onClick={() => setApproveMode(false)}>Cancel</Button>
                      </div>
                    </>
                  )}
                  {isSubAccountTaken && (
                    <Button variant="outline" onClick={() => setApproveMode(false)} className="w-full">Close</Button>
                  )}
                </section>
              )}

              {/* Reject form */}
              {drawerData.status === 'pending' && rejectMode && (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">Reject application</h3>
                  <div>
                    <label className="block text-xs font-medium text-body mb-1.5">Reason (will be sent to applicant)</label>
                    <textarea
                      rows={3}
                      placeholder="E.g. Insufficient business information. Please provide a valid RC number."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-danger/30 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || saving}
                      variant="destructive"
                      className="flex-1"
                    >
                      {saving ? 'Rejecting…' : 'Confirm rejection'}
                    </Button>
                    <Button variant="outline" onClick={() => setRejectMode(false)}>Cancel</Button>
                  </div>
                </section>
              )}
            </div>

            {/* Drawer footer actions for pending */}
            {drawerData.status === 'pending' && !approveMode && !rejectMode && (
              <div className="sticky bottom-0 bg-card border-t border-line px-6 py-4 flex gap-3">
                <Button
                  onClick={() => setApproveMode(true)}
                  className="flex-1 bg-jade hover:bg-jade-deep text-white"
                >
                  <CheckCircle size={14} className="mr-2" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setRejectMode(true)}
                  className="flex-1 text-danger border-danger/20 hover:bg-danger-tint"
                >
                  <XCircle size={14} className="mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
