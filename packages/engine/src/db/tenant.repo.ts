import { eq, and, isNull, lt, isNotNull } from 'drizzle-orm';
import { db } from './client.js';
import { fromTxContext, type DrizzleTx, type TxContext } from './unit-of-work.js';
import { tenants, tenantApiKeys } from './schema.js';

export interface Tenant {
  id: string;
  name: string;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface TenantApiKey {
  id: string;
  tenantId: string;
  keyPrefix: string;
  keyHash: string;
  mode: 'test' | 'live';
  createdAt: Date;
  revokedAt: Date | null;
}

export interface TenantRepo {
  findById(id: string, tx?: TxContext): Promise<Tenant | null>;
  findByApiKeyHash(hash: string, tx?: TxContext): Promise<{ tenant: Tenant; key: TenantApiKey } | null>;
  create(tenant: Tenant, tx?: TxContext): Promise<void>;
  createApiKey(key: TenantApiKey, tx?: TxContext): Promise<void>;
  listApiKeys(tenantId: string): Promise<TenantApiKey[]>;
  revokeApiKey(keyId: string, tenantId: string, revokedAt: Date): Promise<void>;
  deleteExpired(asOf: Date): Promise<number>;
  listIds(): Promise<string[]>;
}

type TenantRow = typeof tenants.$inferSelect;
type KeyRow = typeof tenantApiKeys.$inferSelect;

function toDomainTenant(row: TenantRow): Tenant {
  return { id: row.id, name: row.name, createdAt: row.createdAt, expiresAt: row.expiresAt ?? null };
}

function toDomainKey(row: KeyRow): TenantApiKey {
  return {
    id: row.id,
    tenantId: row.tenantId,
    keyPrefix: row.keyPrefix,
    keyHash: row.keyHash,
    mode: row.mode,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt ?? null,
  };
}

function getClient(tx?: TxContext): DrizzleTx | typeof db {
  return tx ? fromTxContext(tx) : db;
}

export class DrizzleTenantRepo implements TenantRepo {
  async findById(id: string, tx?: TxContext): Promise<Tenant | null> {
    const client = getClient(tx);
    const rows = await client.select().from(tenants).where(eq(tenants.id, id));
    const row = rows[0];
    return row ? toDomainTenant(row) : null;
  }

  async findByApiKeyHash(
    hash: string,
    tx?: TxContext,
  ): Promise<{ tenant: Tenant; key: TenantApiKey } | null> {
    const client = getClient(tx);
    const rows = await client
      .select()
      .from(tenantApiKeys)
      .innerJoin(tenants, eq(tenantApiKeys.tenantId, tenants.id))
      .where(and(eq(tenantApiKeys.keyHash, hash), isNull(tenantApiKeys.revokedAt)));
    const row = rows[0];
    if (!row) return null;
    return {
      tenant: toDomainTenant(row.tenants),
      key: toDomainKey(row.tenant_api_keys),
    };
  }

  async create(tenant: Tenant, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(tenants).values({
      id:        tenant.id,
      name:      tenant.name,
      createdAt: tenant.createdAt,
      expiresAt: tenant.expiresAt,
    });
  }

  async createApiKey(key: TenantApiKey, tx?: TxContext): Promise<void> {
    const client = getClient(tx);
    await client.insert(tenantApiKeys).values({
      id:        key.id,
      tenantId:  key.tenantId,
      keyPrefix: key.keyPrefix,
      keyHash:   key.keyHash,
      mode:      key.mode,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
    });
  }

  async listApiKeys(tenantId: string): Promise<TenantApiKey[]> {
    const rows = await db
      .select()
      .from(tenantApiKeys)
      .where(eq(tenantApiKeys.tenantId, tenantId));
    return rows.map(toDomainKey);
  }

  async revokeApiKey(keyId: string, tenantId: string, revokedAt: Date): Promise<void> {
    await db
      .update(tenantApiKeys)
      .set({ revokedAt })
      .where(and(eq(tenantApiKeys.id, keyId), eq(tenantApiKeys.tenantId, tenantId)));
  }

  async deleteExpired(asOf: Date): Promise<number> {
    const expired = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(and(isNotNull(tenants.expiresAt), lt(tenants.expiresAt, asOf)));

    if (expired.length === 0) return 0;

    const ids = expired.map((r) => r.id);
    for (const id of ids) {
      await db.delete(tenantApiKeys).where(eq(tenantApiKeys.tenantId, id));
      await db.delete(tenants).where(eq(tenants.id, id));
    }

    return ids.length;
  }

  async listIds(): Promise<string[]> {
    const rows = await db.select({ id: tenants.id }).from(tenants);
    return rows.map((r) => r.id);
  }
}
