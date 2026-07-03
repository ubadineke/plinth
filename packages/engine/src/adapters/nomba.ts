import { ulid } from 'ulid';
import type { Kobo } from '../domain/money.js';

export interface CreateVirtualAccountParams {
  accountRef: string;
  accountName: string;
  tenantId: string;
  // When set, the VA is created UNDER this sub-account (path segment) so credits + webhooks route to
  // it, not the parent. Omit → VA lives under the parent.
  subAccountId?: string;
}

export interface CreateVirtualAccountResult {
  accountRef: string;
  nombaAccountHolderId: string;
  accountNumber: string;
  bankName: string;
  accountName: string;
}

export interface ChargeTokenizedCardParams {
  tokenKey: string;
  amountMinor: Kobo;
  merchantTxRef: string;     // unique per attempt — Nomba's idempotency key
  description: string;
  customerEmail?: string;
  callbackUrl?: string;
  tenantSubAccountId?: string;
}

export interface ChargeTokenizedCardResult {
  success: boolean;
  providerReference: string;
  providerCode: string;
  message: string;
}

export interface CreateCheckoutOrderParams {
  amountMinor: Kobo;
  currency: string;
  orderReference: string;
  callbackUrl: string;
  customerEmail: string;
  customerId?: string;
  tenantSubAccountId?: string;
  tokenizeCard?: boolean;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutOrderResult {
  checkoutLink: string;
  orderReference: string;
}

export interface PayoutParams {
  amountMinor: Kobo;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  merchantTxRef: string;
  senderName: string;
}

export interface PayoutResult {
  success: boolean;
  providerReference: string;
  status: 'PENDING_BILLING' | 'NEW' | 'SUCCESS' | 'REFUND';
}

// Cert shape: customerId-based, Nomba handles consent
export interface CreateMandateParams {
  customerId: string;
  maxAmountMinor: Kobo;   // ceiling per debit in kobo
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
}

export interface CreateMandateResult {
  mandateId: string;
  consentUrl: string;   // redirect customer here to approve
}

export interface DebitMandateParams {
  mandateId: string;
  amountMinor: Kobo;
}

export interface DebitMandateResult {
  success: boolean;
  providerReference: string;
  providerCode: string;
  message: string;
}

export interface LookupOrderResult {
  found: boolean;
  settled: boolean;      // true = payment confirmed, activate subscription
  status: string;
  amountMinor?: bigint;  // authoritative amount from Nomba (kobo)
  tokenizedCard?: boolean;
  cardToken?: string;    // present for card payments — use for recurring charges
}

export interface NombaAdapter {
  createVirtualAccount(params: CreateVirtualAccountParams): Promise<CreateVirtualAccountResult>;
  createCheckoutOrder(params: CreateCheckoutOrderParams): Promise<CreateCheckoutOrderResult>;
  chargeTokenizedCard(params: ChargeTokenizedCardParams): Promise<ChargeTokenizedCardResult>;
  lookupOrder(orderReference: string): Promise<LookupOrderResult>;
  payout(params: PayoutParams): Promise<PayoutResult>;
  createMandate(params: CreateMandateParams): Promise<CreateMandateResult>;
  debitMandate(params: DebitMandateParams): Promise<DebitMandateResult>;
}

// ─── Fake adapter (sandbox / tests) ──────────────────────────────────────────

export class FakeNombaAdapter implements NombaAdapter {
  private _nextChargeResult?: ChargeTokenizedCardResult;

  setNextChargeResult(result: ChargeTokenizedCardResult): void {
    this._nextChargeResult = result;
  }

  async createVirtualAccount(params: CreateVirtualAccountParams): Promise<CreateVirtualAccountResult> {
    return {
      accountRef:           params.accountRef,
      nombaAccountHolderId: `fake_holder_${ulid()}`,
      accountNumber:        `939${Math.floor(1000000 + Math.random() * 9000000)}`,
      bankName:             'Nomba MFB',
      accountName:          params.accountName,
    };
  }

  async createCheckoutOrder(params: CreateCheckoutOrderParams): Promise<CreateCheckoutOrderResult> {
    return {
      checkoutLink:   `https://pay.nomba.com/sandbox/fake_${ulid()}`,
      orderReference: params.orderReference,
    };
  }

  async chargeTokenizedCard(params: ChargeTokenizedCardParams): Promise<ChargeTokenizedCardResult> {
    if (this._nextChargeResult) {
      const r = this._nextChargeResult;
      delete this._nextChargeResult;
      return r;
    }
    if (params.amountMinor > 50000000n) {
      return {
        success:           false,
        providerReference: params.merchantTxRef,
        providerCode:      'INSUFFICIENT_FUNDS',
        message:           'Insufficient funds',
      };
    }
    return {
      success:           true,
      providerReference: params.merchantTxRef,
      providerCode:      '00',
      message:           'Approved',
    };
  }

  async lookupOrder(_orderReference: string): Promise<LookupOrderResult> {
    return { found: true, settled: true, status: 'SUCCESS', amountMinor: 0n, tokenizedCard: false };
  }

  async payout(_params: PayoutParams): Promise<PayoutResult> {
    return { success: true, providerReference: `fake_payout_${ulid()}`, status: 'SUCCESS' };
  }

  async createMandate(params: CreateMandateParams): Promise<CreateMandateResult> {
    return {
      mandateId:  `fake_mandate_${ulid()}`,
      consentUrl: `https://pay.nomba.com/sandbox/mandate/fake_${ulid()}`,
    };
  }

  async debitMandate(params: DebitMandateParams): Promise<DebitMandateResult> {
    return { success: true, providerReference: params.mandateId, providerCode: '00', message: 'Success' };
  }
}

// ─── Real HTTP adapter ────────────────────────────────────────────────────────

export interface NombaHttpConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  accountId: string;
  webhookCallbackUrl: string;
}

export class HttpNombaAdapter implements NombaAdapter {
  private tokenCache: { token: string; expiresAt: Date } | null = null;

  constructor(private readonly config: NombaHttpConfig) {}

  // Nomba's money API uses NAIRA (decimals), while we track everything internally as
  // integer kobo. Normalize at the adapter boundary: ₦2,900 = 290000 kobo → send 2900.
  // (Sending kobo makes Nomba charge 100× — a ₦2,900 plan showed as "₦290,000".)
  private toNaira(amountMinor: Kobo): number {
    return Number(amountMinor) / 100;
  }

  private async getToken(): Promise<string> {
    const now = new Date();
    // Cert: tokens last 60 min — refresh at 55-min mark (5 min buffer)
    if (this.tokenCache && this.tokenCache.expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
      return this.tokenCache.token;
    }

    const res = await fetch(`${this.config.baseUrl}/v1/auth/token/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accountId':    this.config.accountId,
      },
      body: JSON.stringify({
        grant_type:    'client_credentials',
        client_id:     this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    const json = await res.json() as {
      code: string;
      data: { access_token: string; expiresAt: string };
    };

    if (json.code !== '00' || !json.data?.access_token) {
      throw new Error(`Nomba auth failed: ${JSON.stringify(json)}`);
    }

    this.tokenCache = {
      token:     json.data.access_token,
      expiresAt: new Date(json.data.expiresAt),
    };

    return this.tokenCache.token;
  }

  private authHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'accountId':     this.config.accountId,
    };
  }

  async createVirtualAccount(params: CreateVirtualAccountParams): Promise<CreateVirtualAccountResult> {
    const token = await this.getToken();

    // Append the sub-account id as a path segment to bind the VA to that sub-account (credits +
    // webhooks route there). Without it, the VA lands under the parent. The accountId HEADER stays
    // the parent regardless (Nomba's rule). Verified against prod: /virtual/{sub} → holder = sub.
    const path = params.subAccountId
      ? `/v1/accounts/virtual/${params.subAccountId}`
      : `/v1/accounts/virtual`;

    // Nomba rejects special characters in the VA account name (and wants 8–64 chars). Strip anything
    // that isn't a letter/number/space, collapse whitespace, and pad a too-short name.
    const cleanName = (params.accountName.replace(/[^a-zA-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Customer')
      .padEnd(8, ' ').slice(0, 64).trim().padEnd(8, 'x');

    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method:  'POST',
      headers: this.authHeaders(token),
      body:    JSON.stringify({
        accountName: cleanName,
        accountRef:  params.accountRef,
        currency:    'NGN',
      }),
    });

    const json = await res.json() as { code: string; data: Record<string, string> };

    if (json.code !== '00') {
      throw new Error(`Nomba createVirtualAccount failed: ${JSON.stringify(json)}`);
    }

    const d = json.data;
    return {
      accountRef:           d['accountRef']        ?? params.accountRef,
      nombaAccountHolderId: d['accountHolderId']   ?? d['nombaAccountHolderId'] ?? '',
      accountNumber:        d['bankAccountNumber'] ?? d['accountNumber'] ?? '',
      bankName:             d['bankName']          ?? '',
      accountName:          d['bankAccountName']   ?? d['accountName'] ?? params.accountName,
    };
  }

  async createCheckoutOrder(params: CreateCheckoutOrderParams): Promise<CreateCheckoutOrderResult> {
    const token = await this.getToken();

    const body: Record<string, unknown> = {
      order: {
        amount:         this.toNaira(params.amountMinor),  // Nomba API is in naira, not kobo
        currency:       params.currency ?? 'NGN',
        orderReference: params.orderReference,
        callbackUrl:    params.callbackUrl,
        customerEmail:  params.customerEmail,
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.tenantSubAccountId ? {
          splitRequest: {
            splitType: 'PERCENTAGE',
            splitList: [{ accountId: params.tenantSubAccountId, value: 99.5 }],
          },
        } : {}),
        ...(params.metadata ? { orderMetaData: params.metadata } : {}),
      },
      tokenizeCard: params.tokenizeCard ?? true,
    };

    const res = await fetch(`${this.config.baseUrl}/v1/checkout/order`, {
      method:  'POST',
      headers: this.authHeaders(token),
      body:    JSON.stringify(body),
    });

    const json = await res.json() as {
      code: string;
      data: { checkoutLink: string; orderReference: string };
    };

    if (json.code !== '00') {
      throw new Error(`Nomba createCheckoutOrder failed: ${JSON.stringify(json)}`);
    }

    return {
      checkoutLink:   json.data.checkoutLink,
      orderReference: json.data.orderReference ?? params.orderReference,
    };
  }

  async chargeTokenizedCard(params: ChargeTokenizedCardParams): Promise<ChargeTokenizedCardResult> {
    const token = await this.getToken();

    const body: Record<string, unknown> = {
      tokenKey: params.tokenKey,
      order: {
        amount:         this.toNaira(params.amountMinor),  // Nomba API is in naira, not kobo
        currency:       'NGN',
        orderReference: params.merchantTxRef,        // unique per attempt = idempotency key
        callbackUrl:    params.callbackUrl ?? `${this.config.webhookCallbackUrl}/webhooks/nomba`,
        customerEmail:  params.customerEmail ?? 'billing@useplinth.xyz',
        ...(params.tenantSubAccountId ? {
          splitRequest: {
            splitType: 'PERCENTAGE',
            splitList: [{ accountId: params.tenantSubAccountId, value: 99.5 }],
          },
        } : {}),
      },
    };

    const res = await fetch(`${this.config.baseUrl}/v1/checkout/tokenized-card-payment`, {
      method:  'POST',
      headers: this.authHeaders(token),
      body:    JSON.stringify(body),
    });

    const json = await res.json() as {
      code: string;
      description: string;
      data?: { status: boolean; message: string };
    };

    const success = json.code === '00' && json.data?.status === true;

    return {
      success,
      providerReference: params.merchantTxRef,
      providerCode:      json.code ?? 'unknown',
      message:           json.data?.message ?? json.description ?? '',
    };
  }

  // Authoritative check of a checkout order. The webhook body is thin and unsigned, so we
  // re-fetch the transaction from Nomba (authenticated) and reconcile from THIS result.
  async lookupOrder(orderReference: string): Promise<LookupOrderResult> {
    const token = await this.getToken();
    const res = await fetch(
      `${this.config.baseUrl}/v1/checkout/transaction?idType=ORDER_REFERENCE&id=${encodeURIComponent(orderReference)}`,
      { headers: this.authHeaders(token) },
    );
    if (!res.ok) return { found: false, settled: false, status: `http_${res.status}` };
    const json = await res.json() as {
      code: string;
      data?: {
        success?: boolean;
        message?: string;
        order?: { amount?: string };
        transactionDetails?: { tokenizedCardPayment?: boolean };
        cardDetails?: { tokenKey?: string; token?: string; cardId?: string } | null;
      };
    };
    if (json.code !== '00' || !json.data) return { found: false, settled: false, status: json.code };

    const d = json.data;
    const settled = d.success === true || /successful/i.test(d.message ?? '');
    // order.amount is in naira (e.g. "300.00") → kobo
    const amountMinor = d.order?.amount != null ? BigInt(Math.round(Number(d.order.amount) * 100)) : undefined;
    const cardToken = d.cardDetails?.tokenKey ?? d.cardDetails?.token ?? d.cardDetails?.cardId;

    return {
      found:         true,
      settled,
      status:        d.message ?? '',
      ...(amountMinor !== undefined ? { amountMinor } : {}),
      tokenizedCard: d.transactionDetails?.tokenizedCardPayment ?? false,
      ...(cardToken ? { cardToken } : {}),
    };
  }

  async payout(_params: PayoutParams): Promise<PayoutResult> {
    throw new Error('HttpNombaAdapter.payout — not yet implemented');
  }

  async createMandate(params: CreateMandateParams): Promise<CreateMandateResult> {
    const token = await this.getToken();

    const res = await fetch(`${this.config.baseUrl}/v1/mandates/create`, {
      method:  'POST',
      headers: this.authHeaders(token),
      body:    JSON.stringify({
        customerId: params.customerId,
        maxAmount:  Number(params.maxAmountMinor),  // kobo
        frequency:  params.frequency,
        startDate:  params.startDate,
        endDate:    params.endDate,
      }),
    });

    const json = await res.json() as {
      code: string;
      data: { mandateId: string; consentUrl: string };
    };

    if (json.code !== '00') {
      throw new Error(`Nomba createMandate failed: ${JSON.stringify(json)}`);
    }

    return {
      mandateId:  json.data.mandateId,
      consentUrl: json.data.consentUrl,
    };
  }

  async debitMandate(params: DebitMandateParams): Promise<DebitMandateResult> {
    const token = await this.getToken();

    const res = await fetch(`${this.config.baseUrl}/v1/mandates/${params.mandateId}/debit`, {
      method:  'POST',
      headers: this.authHeaders(token),
      body:    JSON.stringify({
        amount: Number(params.amountMinor),  // kobo
      }),
    });

    const json = await res.json() as {
      code: string;
      description: string;
      data?: { mandateId: string; status: string; message: string };
    };

    const success = json.code === '00' && json.data?.status === 'SUCCESS';

    return {
      success,
      providerReference: json.data?.mandateId ?? params.mandateId,
      providerCode:      json.code ?? '',
      message:           json.data?.message ?? json.description ?? '',
    };
  }
}
