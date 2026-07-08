import { createHash, randomBytes } from 'crypto';
import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { ClaimTokenRepo } from '../db/claim-token.repo.js';
import type { ApplicationRepo } from '../db/application.repo.js';
import type { TenantRepo } from '../db/tenant.repo.js';
import type { EmailService } from './email.service.js';
import { claimEmail, magicLinkEmail } from './email.service.js';

const CLAIM_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class AuthService {
  constructor(
    private readonly claimTokenRepo: ClaimTokenRepo,
    private readonly applicationRepo: ApplicationRepo,
    private readonly tenantRepo: TenantRepo,
    private readonly email: EmailService,
    private readonly clock: Clock,
    private readonly appBaseUrl: string = 'http://localhost:3000',
  ) {}

  async issueClaimAndNotify(params: {
    tenantId: string;
    toEmail: string;
    businessName: string;
  }): Promise<void> {
    const rawToken = await this.createClaimToken(params.tenantId);
    const claimUrl = `${this.appBaseUrl}/claim?token=${rawToken}`;
    const opts = claimEmail({ businessName: params.businessName, claimUrl });
    await this.email.send({ ...opts, to: params.toEmail });
  }

  async createClaimToken(tenantId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const now = this.clock.now();

    await this.claimTokenRepo.create({
      id:        `ctk_${ulid()}`,
      tenantId,
      tokenHash,
      usedAt:    null,
      expiresAt: new Date(now.getTime() + CLAIM_TOKEN_TTL_MS),
      createdAt: now,
    });

    return rawToken;
  }

  async validateClaimToken(rawToken: string): Promise<{ tenantId: string; apiKey: string }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const record = await this.claimTokenRepo.findByHash(tokenHash);

    if (!record) throw new Error('Invalid or already used claim token');
    if (record.expiresAt < this.clock.now()) throw new Error('Claim token has expired');

    await this.claimTokenRepo.markUsed(record.id, this.clock.now());

    // Create the tenant's API key at claim time
    const rawSecret = randomBytes(32).toString('hex');
    const rawApiKey = `sk_live_${rawSecret}`;
    const keyHash = createHash('sha256').update(rawApiKey).digest('hex');
    const keyPrefix = rawApiKey.slice(0, 12);
    const now = this.clock.now();

    await this.tenantRepo.createApiKey({
      id:        `key_${ulid()}`,
      tenantId:  record.tenantId,
      keyPrefix,
      keyHash,
      mode:      'live',
      createdAt: now,
      revokedAt: null,
    });

    return { tenantId: record.tenantId, apiKey: rawApiKey };
  }

  async demoSession(demoApiKey: string): Promise<{ tenantId: string; apiKey: string }> {
    const hash = createHash('sha256').update(demoApiKey).digest('hex');
    const result = await this.tenantRepo.findByApiKeyHash(hash);
    if (!result) throw new Error('Demo tenant not found — run seed-demo.ts first');
    return { tenantId: result.tenant.id, apiKey: demoApiKey };
  }

  async sendMagicLink(toEmail: string): Promise<void> {
    const app = await this.applicationRepo.findByEmail(toEmail);
    if (!app || !app.tenantId) throw new Error('No approved account found for this email');

    const rawToken = await this.createClaimToken(app.tenantId);
    // mode=login marks this as a returning sign-in (vs the first-time account claim).
    const claimUrl = `${this.appBaseUrl}/claim?token=${rawToken}&mode=login`;

    const opts = magicLinkEmail({ businessName: app.businessName, claimUrl });
    await this.email.send({ ...opts, to: toEmail });
  }
}
