import { ulid } from 'ulid';
import type { CustomerRepo } from '../db/customer.repo.js';
import type { VirtualAccountRepo } from '../db/virtual-account.repo.js';
import type { TenantRepo } from '../db/tenant.repo.js';
import type { NotificationLogRepo, ChannelStatus } from '../db/notification-log.repo.js';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
  type NotificationSettingsRepo,
} from '../db/notification-settings.repo.js';
import type { SmsAdapter } from '../adapters/sms.js';
import { billingNotificationEmail, type EmailService } from './email.service.js';

function naira(minor: bigint | string): string {
  const n = Number(minor) / 100;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

interface Recipient {
  phone: string | null;
  email: string | null;
}

interface Content {
  sms: string;
  subject: string;
  heading: string;
  body: string;
  tone?: 'info' | 'warn' | 'success';
}

interface BaseCtx {
  tenantId: string;
  customerId: string;
}

/**
 * Customer-facing notifications off billing events, over BOTH SMS (Twilio) and email. Every send is:
 *  - Branded with the tenant's chosen brand (Notifications settings override → tenant name → "Plinth").
 *  - Gated by the tenant's notification settings (channels on/off, per-event mute).
 *  - Deduped via notification_log, so a re-run of the same billing tick never double-notifies.
 *  - Best-effort: a channel/provider failure is logged and swallowed — never breaks a billing tick.
 * When no SMS/email provider is configured the adapters are Noop and simply log what they would send.
 */
export class NotificationService {
  private readonly nameCache = new Map<string, string>();

  constructor(
    private readonly customerRepo: CustomerRepo,
    private readonly vaRepo: VirtualAccountRepo,
    private readonly tenantRepo: TenantRepo,
    private readonly sms: SmsAdapter,
    private readonly email: EmailService,
    private readonly logRepo: NotificationLogRepo,
    private readonly settingsRepo: NotificationSettingsRepo,
    private readonly clock: { now(): Date },
    private readonly fallbackBrand = 'Plinth',
  ) {}

  private async tenantName(tenantId: string): Promise<string> {
    const cached = this.nameCache.get(tenantId);
    if (cached) return cached;
    const tenant = await this.tenantRepo.findById(tenantId).catch(() => null);
    const name = tenant?.name?.trim() || this.fallbackBrand;
    this.nameCache.set(tenantId, name);
    return name;
  }

  // Resolve the tenant's live settings + effective brand (override → tenant name → fallback).
  private async resolve(tenantId: string): Promise<{ settings: NotificationSettings; brand: string }> {
    const [settings, name] = await Promise.all([
      this.settingsRepo.get(tenantId).catch(() => ({ ...DEFAULT_NOTIFICATION_SETTINGS })),
      this.tenantName(tenantId),
    ]);
    const brand = settings.brandOverride?.trim() || name;
    return { settings, brand };
  }

  private async recipient(tenantId: string, customerId: string): Promise<Recipient | null> {
    const c = await this.customerRepo.findById(tenantId, customerId).catch(() => null);
    if (!c) return null;
    return { phone: c.phone ?? null, email: c.email ?? null };
  }

  // Gate (settings) → resolve recipient → dedupe → fan out → record per-channel outcome. Contained.
  // Returns the per-channel outcome, or null when nothing was sent (muted / no recipient / duplicate).
  private async dispatch(
    ctx: BaseCtx,
    dedupeKey: string,
    build: (brand: string) => Content,
  ): Promise<{ smsStatus: ChannelStatus; emailStatus: ChannelStatus } | null> {
    try {
      const eventType = dedupeKey.split(':')[0] ?? 'notification';
      const { settings, brand } = await this.resolve(ctx.tenantId);
      if (settings.disabledEvents.includes(eventType)) return null; // this event is muted for the tenant

      const rec = await this.recipient(ctx.tenantId, ctx.customerId);
      const wantSms = settings.smsEnabled && !!rec?.phone;
      const wantEmail = settings.emailEnabled && !!rec?.email;
      if (!rec || (!wantSms && !wantEmail)) {
        console.log(`[notify] nothing to send for ${ctx.customerId} (${eventType}) — skipped`);
        return null;
      }

      const content = build(brand);

      // Claim the dedupe slot only once we have something to send. If already claimed, skip.
      const logId = await this.logRepo.claim({
        tenantId:   ctx.tenantId,
        customerId: ctx.customerId,
        dedupeKey,
        eventType,
        message:    content.sms,
        smsTo:      wantSms ? rec.phone : null,
        emailTo:    wantEmail ? rec.email : null,
        now:        this.clock.now(),
      });
      if (!logId) return null;

      let smsStatus: ChannelStatus = null;
      let emailStatus: ChannelStatus = null;

      if (wantSms && rec.phone) {
        try {
          const r = await this.sms.send(rec.phone, content.sms);
          smsStatus = r.ok ? 'sent' : 'failed';
        } catch (e) {
          smsStatus = 'failed';
          console.warn(`[notify:sms] failed for ${ctx.customerId}:`, e instanceof Error ? e.message : e);
        }
      }
      if (wantEmail && rec.email) {
        try {
          await this.email.send({
            ...billingNotificationEmail({
              brand,
              subject: content.subject,
              heading: content.heading,
              body:    content.body,
              ...(content.tone ? { tone: content.tone } : {}),
            }),
            to: rec.email,
          });
          emailStatus = 'sent';
        } catch (e) {
          emailStatus = 'failed';
          console.warn(`[notify:email] failed for ${ctx.customerId}:`, e instanceof Error ? e.message : e);
        }
      }

      await this.logRepo.finalize(logId, { smsStatus, emailStatus });
      return { smsStatus, emailStatus };
    } catch (e) {
      console.warn(`[notify] dispatch failed for ${ctx.customerId}:`, e instanceof Error ? e.message : e);
      return null;
    }
  }

  // Manual "send reminder" from the dunning board — a payment reminder that always sends (unique
  // dedupe key), including the customer's virtual account if they have one. Reports the outcome.
  async manualReminder(tenantId: string, customerId: string): Promise<{ ok: boolean; error?: string }> {
    const va = await this.vaRepo.findByCustomer(tenantId, customerId).catch(() => null);
    const where = va ? ` to ${va.accountNumber} (${va.bankName})` : '';
    // Unique per click (a ULID, NOT the clock) — a frozen test clock would otherwise collide every send.
    const key = `reminder:${customerId}:${ulid()}`;
    const res = await this.dispatch({ tenantId, customerId }, key, (brand) => ({
      sms:     `${brand}: a reminder that your subscription payment is due. Please pay${where} to keep your plan active.`,
      subject: `Payment reminder`,
      heading: `Payment reminder`,
      body:    `This is a reminder that your subscription payment is due. ${va ? `Transfer to ${va.accountNumber} (${va.bankName}) to keep your plan active.` : 'Please complete payment to keep your plan active.'}`,
      tone:    'warn',
    }));
    if (!res) return { ok: false, error: 'No reachable channel (customer has no phone/email, or notifications are disabled).' };
    const ok = res.smsStatus === 'sent' || res.emailStatus === 'sent';
    return ok ? { ok } : { ok, error: 'All channels failed to send.' };
  }

  // Fire a one-off test notification (from the dashboard) to verify SMS / email delivery works.
  async sendTest(tenantId: string, channel: 'sms' | 'email', to: string): Promise<{ ok: boolean; error?: string }> {
    const { brand } = await this.resolve(tenantId);
    const body = `This is a test notification from your ${brand} billing dashboard. If you received this, your ${channel} setup is working.`;
    try {
      if (channel === 'sms') {
        const r = await this.sms.send(to, `${brand}: ${body}`);
        return { ok: r.ok };
      }
      await this.email.send({
        ...billingNotificationEmail({ brand, subject: `Test notification from ${brand}`, heading: 'Test notification', body, tone: 'info' }),
        to,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
    }
  }

  // ── Dunning / payment lifecycle ──────────────────────────────────────────────

  // Transfer-rail payment due — the flagship: tells the customer their dedicated account + amount.
  async paymentDue(ctx: BaseCtx & { invoiceId: string; amountMinor: bigint }): Promise<void> {
    const amount = naira(ctx.amountMinor);
    const va = await this.vaRepo.findByCustomer(ctx.tenantId, ctx.customerId).catch(() => null);
    const where = va ? ` to ${va.accountNumber} (${va.bankName})` : '';
    await this.dispatch(ctx, `payment_due:${ctx.invoiceId}`, (brand) => ({
      sms:     `${brand}: your subscription payment of ${amount} is due. Transfer${where} to keep your plan active.`,
      subject: `Your ${brand} payment of ${amount} is due`,
      heading: 'Payment due',
      body:    `Your subscription payment of ${amount} is due. ${va ? `Transfer to ${va.accountNumber} (${va.bankName}) to keep your plan active.` : 'Please complete payment to keep your plan active.'}`,
      tone:    'info',
    }));
  }

  async pastDue(ctx: BaseCtx & { invoiceId: string }): Promise<void> {
    await this.dispatch(ctx, `past_due:${ctx.invoiceId}`, (brand) => ({
      sms:     `${brand}: we couldn't collect your subscription payment. Please update your payment to avoid losing access.`,
      subject: `Payment failed — action needed`,
      heading: `We couldn't collect your payment`,
      body:    `We weren't able to collect your latest subscription payment. Please update your payment method to avoid losing access. We'll retry automatically in the meantime.`,
      tone:    'warn',
    }));
  }

  async delinquent(ctx: BaseCtx & { subscriptionId: string; occurredAt: Date }): Promise<void> {
    await this.dispatch(ctx, `delinquent:${ctx.subscriptionId}:${ctx.occurredAt.toISOString()}`, (brand) => ({
      sms:     `${brand}: your subscription is now on hold for non-payment. Pay now to restore access.`,
      subject: `Your subscription is on hold`,
      heading: `Your subscription is on hold`,
      body:    `Your subscription has been placed on hold due to non-payment. Make a payment now to restore your access.`,
      tone:    'warn',
    }));
  }

  async recovered(ctx: BaseCtx & { subscriptionId: string; invoiceId?: string | null; occurredAt: Date }): Promise<void> {
    const key = ctx.invoiceId ? `recovered:${ctx.invoiceId}` : `recovered:${ctx.subscriptionId}:${ctx.occurredAt.toISOString()}`;
    await this.dispatch(ctx, key, (brand) => ({
      sms:     `${brand}: payment received — your subscription is active again. Thank you!`,
      subject: `You're all set — subscription reactivated`,
      heading: `Payment received`,
      body:    `Thanks — we received your payment and your subscription is active again.`,
      tone:    'success',
    }));
  }

  // ── Positive lifecycle moments ───────────────────────────────────────────────

  // First activation — the welcome. Includes the amount charged for the first period.
  async activated(ctx: BaseCtx & { invoiceId: string; amountMinor?: bigint }): Promise<void> {
    const paid = ctx.amountMinor != null ? ` of ${naira(ctx.amountMinor)}` : '';
    await this.dispatch(ctx, `activated:${ctx.invoiceId}`, (brand) => ({
      sms:     `${brand}: your subscription is active. Welcome aboard — thank you for subscribing!`,
      subject: `Welcome to ${brand} — your subscription is active`,
      heading: `Welcome aboard!`,
      body:    `Your subscription is now active${paid ? `, and your first payment${paid} was received` : ''}. Thanks for subscribing to ${brand}.`,
      tone:    'success',
    }));
  }

  // Ongoing renewal payment succeeded — the receipt.
  async paymentReceipt(ctx: BaseCtx & { invoiceId: string; amountMinor: bigint }): Promise<void> {
    const amount = naira(ctx.amountMinor);
    await this.dispatch(ctx, `receipt:${ctx.invoiceId}`, (brand) => ({
      sms:     `${brand}: payment of ${amount} received. Your subscription is renewed — thank you!`,
      subject: `Payment received — ${amount}`,
      heading: `Payment received`,
      body:    `We received your subscription payment of ${amount}. Your plan has been renewed. Thank you!`,
      tone:    'success',
    }));
  }

  async trialEnded(ctx: BaseCtx & { subscriptionId: string }): Promise<void> {
    await this.dispatch(ctx, `trial_ended:${ctx.subscriptionId}`, (brand) => ({
      sms:     `${brand}: your free trial has ended and your subscription is now active. Thank you for staying with us!`,
      subject: `Your ${brand} trial has ended`,
      heading: `Your free trial has ended`,
      body:    `Your free trial has ended and your paid subscription is now active. Thanks for continuing with ${brand}.`,
      tone:    'info',
    }));
  }

  async canceled(ctx: BaseCtx & { subscriptionId: string }): Promise<void> {
    await this.dispatch(ctx, `canceled:${ctx.subscriptionId}`, (brand) => ({
      sms:     `${brand}: your subscription has been canceled. We're sorry to see you go — you can resubscribe anytime.`,
      subject: `Your ${brand} subscription was canceled`,
      heading: `Subscription canceled`,
      body:    `Your subscription has been canceled and will no longer renew. You're welcome back anytime — just resubscribe to pick up where you left off.`,
      tone:    'info',
    }));
  }
}
