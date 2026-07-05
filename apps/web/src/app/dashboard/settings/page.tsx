'use client';
import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertTriangle, CheckCircle, Copy, Check, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

const VERTICAL_TABS = [
  { id: 'general',       label: 'General' },
  { id: 'apikeys',       label: 'API Keys' },
  { id: 'billing',       label: 'Billing Policy' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'testmode',      label: 'Test Mode' },
];

const NOTIFY_EVENTS = [
  { key: 'payment_due', label: 'Payment due',        hint: 'Transfer-rail reminder with the account to pay into' },
  { key: 'past_due',    label: 'Past due',           hint: 'Charge failed — asks the customer to update payment' },
  { key: 'delinquent',  label: 'On hold (delinquent)', hint: 'Access suspended for non-payment' },
  { key: 'recovered',   label: 'Recovered',          hint: 'Payment received after dunning — back to active' },
  { key: 'activated',   label: 'Welcome',            hint: 'First activation of a subscription' },
  { key: 'receipt',     label: 'Payment receipt',    hint: 'Successful renewal payment' },
  { key: 'trial_ended', label: 'Trial ended',        hint: 'Free trial converted to a paid subscription' },
  { key: 'canceled',    label: 'Canceled',           hint: 'Subscription canceled' },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150',
        on ? 'bg-jade' : 'bg-line',
      )}
    >
      <motion.span
        animate={{ x: on ? 18 : 3 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
        className="inline-block h-3.5 w-3.5 rounded-full bg-white"
      />
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);

  // Current tenant
  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    api.me.get().then((t) => setTenant({ id: t.id, name: t.name })).catch(() => {});
  }, []);

  // Billing policy state
  const [upgradeStrategy, setUpgradeStrategy] = useState('immediate_prorated');
  const [downgradeStrategy, setDowngradeStrategy] = useState('at_period_end');
  const [dunningChanges, setDunningChanges] = useState('gate_upgrades');
  const [graceDays, setGraceDays] = useState('7');
  const [maxDebt, setMaxDebt] = useState('5000');
  const [maxAttempts, setMaxAttempts] = useState('4');
  const [paydayDay, setPaydayDay] = useState('25');

  // Clock state
  const [clockSeconds, setClockSeconds] = useState('');
  const [tickRunning, setTickRunning] = useState(false);

  // API keys state
  type ApiKey = { id: string; prefix: string; mode: string; created_at: string; revoked_at: string | null };
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (activeTab !== 'apikeys') return;
    setKeysLoading(true);
    api.keys.list()
      .then((res: any) => setKeys(res.data ?? []))
      .catch(() => {})
      .finally(() => setKeysLoading(false));
  }, [activeTab]);

  // Notification settings state
  const [notifSms, setNotifSms] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifBrand, setNotifBrand] = useState('');
  const [notifDisabled, setNotifDisabled] = useState<string[]>([]);
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [testChannel, setTestChannel] = useState<'sms' | 'email'>('sms');
  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (activeTab !== 'notifications') return;
    api.notificationSettings.get()
      .then((s: any) => {
        setNotifSms(s.sms_enabled ?? true);
        setNotifEmail(s.email_enabled ?? true);
        setNotifBrand(s.brand_override ?? '');
        setNotifDisabled(s.disabled_events ?? []);
      })
      .catch(() => {});
  }, [activeTab]);

  function toggleEvent(key: string) {
    setNotifDisabled((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function saveNotifSettings() {
    setNotifSaving(true);
    try {
      await api.notificationSettings.update({
        sms_enabled:     notifSms,
        email_enabled:   notifEmail,
        brand_override:  notifBrand.trim() || null,
        disabled_events: notifDisabled,
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch {} finally {
      setNotifSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r: any = await api.notificationSettings.test(testChannel, testTo.trim());
      setTestResult({ ok: !!r.ok, text: r.ok ? 'Sent — check the recipient.' : `Failed: ${r.error ?? 'provider error'}` });
    } catch {
      setTestResult({ ok: false, text: 'Failed — check the provider is configured (Twilio / SMTP).' });
    } finally {
      setTesting(false);
    }
  }

  async function createKey() {
    setCreating(true);
    try {
      const res = await api.keys.create('live');
      setNewKey(res.api_key);
      setKeys((prev) => [{ id: res.id, prefix: res.prefix, mode: 'live', created_at: new Date().toISOString(), revoked_at: null }, ...prev]);
    } catch {} finally { setCreating(false); }
  }

  async function revokeKey(id: string) {
    if (!confirm('Revoke this key? Any requests using it will stop working immediately.')) return;
    await api.keys.revoke(id);
    setKeys((prev) => prev.map((k) => k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k));
  }

  // Rotate = create a fresh key (same mode) and revoke the old one. The new full key is
  // shown once in the banner — copy it before leaving the page.
  async function rotateKey(k: ApiKey) {
    if (!confirm('Rotate this key? A new key is created and this one is revoked immediately.')) return;
    setCreating(true);
    try {
      const res = await api.keys.create(k.mode as 'live' | 'test');
      setNewKey(res.api_key);
      await api.keys.revoke(k.id);
      const now = new Date().toISOString();
      setKeys((prev) => [
        { id: res.id, prefix: res.prefix, mode: k.mode, created_at: now, revoked_at: null },
        ...prev.map((x) => (x.id === k.id ? { ...x, revoked_at: now } : x)),
      ]);
    } catch {} finally {
      setCreating(false);
    }
  }

  function copyNewKey() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function runTick() {
    setTickRunning(true);
    await new Promise((r) => setTimeout(r, 1000));
    setTickRunning(false);
  }

  return (
    <div className="flex flex-col">
      <Topbar title="Settings" />

      <div className="p-6">
        <div className="flex gap-6">
          {/* Vertical tabs */}
          <div className="w-40 shrink-0">
            <nav className="space-y-0.5">
              {VERTICAL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    activeTab === tab.id
                      ? 'bg-jade-tint text-jade-deep font-medium'
                      : 'text-mid hover:bg-soft',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-4">
            {activeTab === 'general' && (
              <>
                <Card>
                  <CardHeader><CardTitle>Tenant</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-body mb-1.5">Tenant Name</label>
                      <Input value={tenant?.name ?? ''} readOnly className="bg-soft" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-body mb-1.5">Tenant ID</label>
                      <Input value={tenant?.id ?? ''} readOnly className="font-mono bg-soft" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>API Keys</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-mid">
                      Create and manage your API keys in the <span className="font-medium text-body">API Keys</span> tab.
                      For security, a key&apos;s full value is shown <span className="font-medium text-body">only once</span> when
                      you create it — afterwards only its prefix is visible.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('apikeys')}>
                      Manage API keys
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Webhooks</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-body mb-1.5">Webhook URL</label>
                      <Input placeholder="https://your-app.com/webhooks" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-body mb-1.5">Signing Secret</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showSecret ? 'text' : 'password'}
                          value="whsec_abcdef1234567890"
                          readOnly
                          className="font-mono bg-soft"
                        />
                        <button
                          onClick={() => setShowSecret(!showSecret)}
                          className="text-faint hover:text-mid p-2"
                        >
                          {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                    <Button>Save webhook</Button>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'apikeys' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>API Keys</CardTitle>
                      <Button size="sm" onClick={createKey} disabled={creating}>
                        <Plus size={14} className="mr-1.5" />
                        {creating ? 'Creating…' : 'New key'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {newKey && (
                      <div className="bg-jade-tint border border-jade/20 rounded-lg p-4 space-y-2">
                        <p className="text-xs font-medium text-jade-deep">New key created — copy it now. It won't be shown again.</p>
                        <div className="flex items-center gap-2 bg-card border border-jade/20 rounded-lg px-3 py-2">
                          <code className="flex-1 text-xs font-mono text-ink break-all">{newKey}</code>
                          <button onClick={copyNewKey} className="shrink-0 text-faint hover:text-jade-deep">
                            {copied ? <Check size={14} className="text-jade" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <button onClick={() => setNewKey(null)} className="text-xs text-jade-deep hover:underline">Dismiss</button>
                      </div>
                    )}

                    {keysLoading ? (
                      <p className="text-xs text-faint py-4 text-center">Loading…</p>
                    ) : keys.length === 0 ? (
                      <p className="text-xs text-faint py-4 text-center">No API keys yet. Create one above.</p>
                    ) : (
                      <div className="divide-y divide-line">
                        {keys.map((k) => (
                          <div key={k.id} className="flex items-center justify-between py-3">
                            <div>
                              <code className="text-xs font-mono text-ink">{k.prefix}••••••••</code>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={cn('text-xs', k.mode === 'live' ? 'text-jade-deep' : 'text-warn')}>{k.mode}</span>
                                <span className="text-xs text-faint">Created {new Date(k.created_at).toLocaleDateString()}</span>
                                {k.revoked_at && <span className="text-xs text-danger">Revoked</span>}
                              </div>
                            </div>
                            {!k.revoked_at && (
                              <div className="flex items-center gap-3">
                                <button onClick={() => rotateKey(k)} disabled={creating} className="text-xs font-medium text-mid hover:text-jade-deep disabled:opacity-50">
                                  Rotate
                                </button>
                                <button onClick={() => revokeKey(k.id)} title="Revoke" className="text-faint/70 hover:text-danger transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'billing' && (
              <>
                <Card>
                  <CardHeader><CardTitle>Active Preset</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-jade" />
                        <span className="text-sm font-medium text-ink">SaaS-Standard</span>
                        <span className="text-xs bg-jade-tint text-jade-deep px-1.5 py-0.5 rounded">active</span>
                      </div>
                      <Button variant="outline" size="sm">Change preset</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Policy Knobs</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-body mb-1.5" title="When a customer upgrades, charge immediately with proration or wait until the next billing period">
                        Upgrade Strategy
                      </label>
                      <Select value={upgradeStrategy} onChange={(e) => setUpgradeStrategy(e.target.value)}>
                        <option value="immediate_prorated">Immediate (prorated)</option>
                        <option value="at_period_end">At period end</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-body mb-1.5" title="When a customer downgrades, apply at end of period or immediately with credit">
                        Downgrade Strategy
                      </label>
                      <Select value={downgradeStrategy} onChange={(e) => setDowngradeStrategy(e.target.value)}>
                        <option value="at_period_end">At period end</option>
                        <option value="immediate_credit">Immediate (with credit)</option>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-body mb-1.5" title="What plan changes to allow while a subscription is in dunning">
                        Changes During Dunning
                      </label>
                      <Select value={dunningChanges} onChange={(e) => setDunningChanges(e.target.value)}>
                        <option value="gate_upgrades">Gate upgrades only</option>
                        <option value="block_all">Block all</option>
                        <option value="allow_all">Allow all</option>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-body mb-1.5" title="Days of grace period after a charge fails before subscription is cancelled">
                          Grace Period (days)
                        </label>
                        <Input type="number" value={graceDays} onChange={(e) => setGraceDays(e.target.value)} min="1" max="30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-body mb-1.5" title="Maximum amount of debt allowed before marking a subscription delinquent">
                          Max Debt Cap (₦)
                        </label>
                        <Input type="number" value={maxDebt} onChange={(e) => setMaxDebt(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-body mb-1.5" title="Number of payment retry attempts before marking as delinquent">
                          Max Dunning Attempts
                        </label>
                        <Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} min="1" max="6" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-body mb-1.5" title="Day of month to attempt charges (for payday-aligned billing)">
                          Payday Day (1–31)
                        </label>
                        <Input type="number" value={paydayDay} onChange={(e) => setPaydayDay(e.target.value)} min="1" max="31" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button onClick={handleSave}>
                        {saved ? '✓ Saved' : 'Save policy'}
                      </Button>
                      {saved && <span className="text-xs text-jade-deep">Changes saved</span>}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'notifications' && (
              <>
                <Card>
                  <CardHeader><CardTitle>Channels</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">SMS (Twilio)</p>
                        <p className="text-xs text-mid">Text customers on billing events.</p>
                      </div>
                      <Toggle on={notifSms} onChange={setNotifSms} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">Email</p>
                        <p className="text-xs text-mid">Send branded emails on billing events.</p>
                      </div>
                      <Toggle on={notifEmail} onChange={setNotifEmail} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Brand</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <label className="block text-xs font-medium text-body">Sender / brand name</label>
                    <Input value={notifBrand} onChange={(e) => setNotifBrand(e.target.value)} placeholder={tenant?.name ?? 'Your business name'} />
                    <p className="text-xs text-mid">
                      Shown to customers in every SMS and email. Leave blank to use your business name
                      {' '}(<span className="font-medium">{tenant?.name ?? '—'}</span>).
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Events</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {NOTIFY_EVENTS.map((ev) => (
                      <div key={ev.key} className="flex items-center justify-between">
                        <div className="pr-4">
                          <p className="text-sm font-medium text-ink">{ev.label}</p>
                          <p className="text-xs text-mid">{ev.hint}</p>
                        </div>
                        <Toggle on={!notifDisabled.includes(ev.key)} onChange={() => toggleEvent(ev.key)} />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex items-center gap-3">
                  <Button onClick={saveNotifSettings} disabled={notifSaving}>
                    {notifSaved ? '✓ Saved' : notifSaving ? 'Saving…' : 'Save notifications'}
                  </Button>
                  {notifSaved && <span className="text-xs text-jade-deep">Changes saved</span>}
                </div>

                <Card>
                  <CardHeader><CardTitle>Send a test</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-[120px_1fr] gap-3">
                      <Select value={testChannel} onChange={(e) => setTestChannel(e.target.value as 'sms' | 'email')}>
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                      </Select>
                      <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder={testChannel === 'sms' ? '+234…' : 'you@example.com'} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={sendTest} disabled={testing || !testTo.trim()}>
                        {testing ? 'Sending…' : 'Send test'}
                      </Button>
                      {testResult && (
                        <span className={cn('text-xs', testResult.ok ? 'text-jade-deep' : 'text-danger')}>
                          {testResult.text}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'testmode' && (
              <>
                <div className="flex items-center gap-2 px-4 py-3 bg-warn-tint border border-warn/20 rounded-xl">
                  <AlertTriangle size={14} className="text-warn shrink-0" />
                  <p className="text-xs text-warn">
                    Test mode changes are isolated to your test API key. No real payments are processed.
                  </p>
                </div>

                <Card>
                  <CardHeader><CardTitle>Simulated Clock</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-soft rounded-lg">
                      <div>
                        <p className="text-xs text-mid">Current simulated time</p>
                        <p className="text-sm font-mono font-semibold text-ink">2026-06-17T00:00:00Z</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-body mb-1.5">
                        Advance by (seconds)
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="e.g. 86400 = 1 day"
                          value={clockSeconds}
                          onChange={(e) => setClockSeconds(e.target.value)}
                        />
                        <Button disabled={!clockSeconds}>Advance</Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Advance 1 month</Button>
                      <Button variant="outline" size="sm">Advance 1 year</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Billing Tick</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-xs text-mid mb-4">
                      Run the billing engine tick manually to process due invoices, retries, and state transitions.
                    </p>
                    <Button onClick={runTick} disabled={tickRunning}>
                      {tickRunning ? 'Running…' : 'Run tick now'}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
