export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  // Overrides the visible From name for this one send (e.g. the tenant's brand for a
  // customer-facing notification, so a Nollybox customer doesn't see "Plinth" in their inbox).
  fromName?: string;
}

export interface EmailService {
  send(opts: SendEmailOptions): Promise<void>;
}

// HTTPS API, not SMTP — works on hosts (like Render's free tier) that block outbound port 25.
export class ResendEmailService implements EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
    private readonly defaultFromName = 'Plinth',
  ) {}

  async send(opts: SendEmailOptions): Promise<void> {
    const fromName = opts.fromName ?? this.defaultFromName;
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${fromName} <${this.fromEmail}>`,
        to:      opts.to,
        subject: opts.subject,
        html:    opts.html,
        text:    opts.text,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
    }
  }
}

export class NoopEmailService implements EmailService {
  async send(opts: SendEmailOptions): Promise<void> {
    console.log(`[email] (no SMTP configured) Would send to ${opts.to} — "${opts.subject}"`);
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function claimEmail(params: { businessName: string; claimUrl: string }): SendEmailOptions {
  const { businessName, claimUrl } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="background:#4f46e5;padding:28px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px;">⚡ Plinth</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You're approved, ${businessName}!</h1>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
            Your Plinth workspace is ready. Click the button below to claim your account and get started.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td>
            <a href="${claimUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;">
              Claim your account →
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:13px;color:#9ca3af;">This link expires in 7 days and can only be used once. If you didn't apply for Plinth, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Or copy this link: <a href="${claimUrl}" style="color:#4f46e5;">${claimUrl}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: 'Claim your Plinth account',
    html,
    text: `You're approved, ${businessName}!\n\nClaim your Plinth account here:\n${claimUrl}\n\nThis link expires in 7 days and can only be used once.`,
    to: '',
  };
}

export function magicLinkEmail(params: { businessName: string; claimUrl: string }): SendEmailOptions {
  const { businessName, claimUrl } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="background:#4f46e5;padding:28px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px;">⚡ Plinth</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Your login link, ${businessName}</h1>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
            Click the button below to log in to your Plinth dashboard. This link is single-use and expires in 7 days.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td>
            <a href="${claimUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 28px;border-radius:8px;">
              Log in to dashboard →
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:13px;color:#9ca3af;">If you didn't request this, you can safely ignore it. Your account remains secure.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Or copy this link: <a href="${claimUrl}" style="color:#4f46e5;">${claimUrl}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return {
    subject: 'Your Plinth login link',
    html,
    text: `Log in to your Plinth dashboard:\n${claimUrl}\n\nThis link expires in 7 days and can only be used once.`,
    to: '',
  };
}

export function approvalEmail(params: {
  businessName: string;
  tenantId: string;
  apiKey: string;
  loginUrl: string;
}): SendEmailOptions {
  const { businessName, tenantId, apiKey, loginUrl } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:#4f46e5;padding:28px 32px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px;">⚡ Plinth</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You're approved, ${businessName}!</h1>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
            Your Plinth workspace is ready. Use the credentials below to log in and start billing.
          </p>

          <!-- Credentials -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="padding-bottom:16px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;">Tenant ID</p>
              <p style="margin:0;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;font-family:monospace;font-size:13px;color:#111827;word-break:break-all;">${tenantId}</p>
            </td></tr>
            <tr><td>
              <p style="margin:0 0 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;">API Key</p>
              <p style="margin:0;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;font-family:monospace;font-size:13px;color:#111827;word-break:break-all;">${apiKey}</p>
            </td></tr>
          </table>

          <!-- Warning -->
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;margin-bottom:28px;">
            <p style="margin:0;font-size:13px;color:#92400e;">
              <strong>Keep your API key safe.</strong> It grants full access to your Plinth workspace. Do not share it publicly or commit it to version control.
            </p>
          </div>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
              Log in to your dashboard →
            </a>
          </td></tr></table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            You're receiving this because your application to Plinth was approved. Questions? Reply to this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `You're approved, ${businessName}!\n\nTenant ID: ${tenantId}\nAPI Key: ${apiKey}\n\nLog in at: ${loginUrl}\n\nKeep your API key safe — it grants full access to your workspace.`;

  return { to: '', subject: `Your Plinth API key is ready`, html, text };
}

// Customer-facing billing notification email. Branded with the TENANT's name (not "Plinth") so the
// end customer sees the business they subscribed to. `tone` shades the accent bar for the moment.
export function billingNotificationEmail(params: {
  brand: string;
  subject: string;
  heading: string;
  body: string;
  tone?: 'info' | 'warn' | 'success';
}): SendEmailOptions {
  const { brand, subject, heading, body } = params;
  const accent = params.tone === 'warn' ? '#b45309' : params.tone === 'success' ? '#047857' : '#4f46e5';
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td style="background:${accent};padding:24px 32px;">
          <p style="margin:0;font-size:19px;font-weight:700;color:#fff;letter-spacing:-0.3px;">${esc(brand)}</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:21px;font-weight:700;color:#111827;">${esc(heading)}</h1>
          <p style="margin:0;color:#374151;font-size:15px;line-height:1.65;">${esc(body)}</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">You're receiving this because you have a subscription with ${esc(brand)}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { to: '', subject, html, text: `${heading}\n\n${body}`, fromName: brand };
}
