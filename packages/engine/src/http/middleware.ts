import type { MiddlewareHandler, ErrorHandler } from 'hono';
import { createHash } from 'crypto';
import { eq, and, lt } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '../db/client.js';
import { idempotencyKeys } from '../db/schema.js';
import type { TenantRepo } from '../db/tenant.repo.js';
import {
  DomainError,
  IdempotencyConflictError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  CardError,
} from '../domain/errors.js';

// ── Auth ──────────────────────────────────────────────────────────────────────

export function makeAuthMiddleware(tenantRepo: TenantRepo): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization') ?? c.req.header('X-API-Key');
    const rawKey = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader ?? null;

    if (!rawKey) throw new UnauthorizedError();

    const hash = createHash('sha256').update(rawKey).digest('hex');
    const result = await tenantRepo.findByApiKeyHash(hash);
    if (!result || result.key.revokedAt) throw new UnauthorizedError();

    c.set('tenantId', result.tenant.id);
    c.set('tenantName', result.tenant.name);
    await next();
  };
}

// ── Error ─────────────────────────────────────────────────────────────────────

export const errorMiddleware: ErrorHandler = (err, c) => {
  if (err instanceof UnauthorizedError) {
    return c.json({ error: { type: err.type, code: err.code, message: err.message } }, 401);
  }
  if (err instanceof IdempotencyConflictError) {
    return c.json({ error: { type: err.type, code: err.code, message: err.message } }, 409);
  }
  if (err instanceof NotFoundError) {
    return c.json({ error: { type: err.type, code: err.code, message: err.message } }, 404);
  }
  if (err instanceof ConflictError) {
    return c.json({ error: { type: err.type, code: err.code, message: err.message, existing_id: err.existingId } }, 409);
  }
  if (err instanceof CardError) {
    return c.json(
      { error: { type: err.type, code: err.code, message: err.message, decline_code: err.declineCode } },
      402,
    );
  }
  if (err instanceof DomainError) {
    return c.json({ error: { type: err.type, code: err.code, message: err.message, param: err.param } }, 400);
  }

  console.error(
    JSON.stringify({
      level: 'error',
      event: 'unhandled_error',
      correlationId: c.get('correlationId') ?? null,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );
  return c.json({ error: { type: 'api_error', code: 'internal_error', message: 'An unexpected error occurred' } }, 500);
};

// ── Idempotency ───────────────────────────────────────────────────────────────

const KEY_TTL_HOURS = 24;

export const idempotencyMiddleware: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== 'POST') {
    await next();
    return;
  }

  const idempKey = c.req.header('Idempotency-Key');
  if (!idempKey) {
    await next();
    return;
  }

  const tenantId: string = c.get('tenantId') ?? '__bootstrap__';

  const rawBody = await c.req.text();
  const fingerprint = createHash('sha256')
    .update(`${c.req.method}:${c.req.path}:${rawBody}`)
    .digest('hex');

  const init: RequestInit = { method: c.req.method, headers: c.req.raw.headers };
  if (rawBody) init.body = rawBody;
  c.req.raw = new Request(c.req.url, init);

  const existing = await db
    .select()
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.key, idempKey)));

  const record = existing[0];

  if (record) {
    if (record.requestFingerprint !== fingerprint) {
      throw new IdempotencyConflictError();
    }
    if (record.responseStatus != null && record.responseBody != null) {
      return c.json(record.responseBody, record.responseStatus as 200 | 201 | 400 | 409 | 500);
    }
    return c.json({ processing: true }, 200);
  }

  const id = `idk_${ulid()}`;
  const now = new Date();
  await db.insert(idempotencyKeys).values({
    id,
    tenantId,
    key: idempKey,
    requestFingerprint: fingerprint,
    lockedAt: now,
    createdAt: now,
  });

  await next();

  const status = c.res.status;
  let body: unknown;
  try {
    body = await c.res.clone().json();
  } catch {
    body = null;
  }

  await db
    .update(idempotencyKeys)
    .set({ responseStatus: status, responseBody: body, lockedAt: null })
    .where(and(eq(idempotencyKeys.tenantId, tenantId), eq(idempotencyKeys.key, idempKey)));

  const cutoff = new Date(now.getTime() - KEY_TTL_HOURS * 3600 * 1000);
  db.delete(idempotencyKeys)
    .where(and(eq(idempotencyKeys.tenantId, tenantId), lt(idempotencyKeys.createdAt, cutoff)))
    .catch(() => void 0);
  return;
};

// ── Logging ───────────────────────────────────────────────────────────────────

const DENY_LIST = new Set([
  'pan', 'card_number', 'cardnumber', 'cvv', 'cvc', 'pin', 'track', 'sad',
  'bvn', 'nin', 'password', 'passwd',
  'client_secret', 'clientsecret', 'api_secret', 'apisecret',
  'webhook_secret', 'webhooksecret', 'signing_key', 'signingkey',
  'token_key', 'tokenkey', 'tokenKey', 'access_token', 'accesstoken',
  'authorization', 'bearer', 'key_hash', 'keyhash',
]);

function isDenied(key: string): boolean {
  return DENY_LIST.has(key.toLowerCase().replace(/[_-]/g, ''));
}

export function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k] = isDenied(k) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

export const loggingMiddleware: MiddlewareHandler = async (c, next) => {
  const correlationId = `req_${ulid()}`;
  c.set('correlationId', correlationId);

  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  console.log(
    JSON.stringify({
      level: 'info',
      event: 'request.start',
      correlationId,
      method,
      path,
      tenantId: c.get('tenantId') ?? null,
    }),
  );

  await next();

  const duration = Date.now() - start;
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'request.end',
      correlationId,
      method,
      path,
      status: c.res.status,
      durationMs: duration,
      tenantId: c.get('tenantId') ?? null,
    }),
  );
};
