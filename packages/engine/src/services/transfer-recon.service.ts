import { ulid } from 'ulid';
import type { Clock } from '../adapters/clock.js';
import type { UnitOfWork } from '../db/unit-of-work.js';
import type { VirtualAccountRepo } from '../db/virtual-account.repo.js';
import type { InboundTransferRepo, InboundTransferEvent } from '../db/inbound-transfer.repo.js';
import type { SuspenseRepo } from '../db/suspense.repo.js';
import type { InvoiceRepo } from '../db/invoice.repo.js';
import type { EventRepo } from '../db/event.repo.js';
import type { PostLedgerEntryService } from './ledger.service.js';

const TOLERANCE_KOBO = 10_000n; // ₦100 tolerance

export interface IncomingTransfer {
  nombaRequestId: string;
  accountRef:     string;
  amountMinor:    bigint;
  narration:      string;
  sessionId:      string;
}

export class TransferReconService {
  constructor(
    private readonly vaRepo:          VirtualAccountRepo,
    private readonly inboundRepo:     InboundTransferRepo,
    private readonly suspenseRepo:    SuspenseRepo,
    private readonly invoiceRepo:     InvoiceRepo,
    private readonly eventRepo:       EventRepo,
    private readonly postLedgerEntry: PostLedgerEntryService,
    private readonly uow:             UnitOfWork,
    private readonly clock:           Clock,
    // Activates a pending (incomplete) subscription on first payment — reuses the checkout activation
    // path (records the first-period paid invoice + flips to active). Returns how many it activated.
    private readonly activatePending: (tenantId: string, customerId: string) => Promise<number> = async () => 0,
    // Recovers a customer's dunning (past_due/grace/delinquent) subscription to active AFTER the
    // outstanding invoice is settled by an incoming transfer. Returns how many it recovered.
    private readonly recoverDunning: (tenantId: string, customerId: string) => Promise<number> = async () => 0,
  ) {}

  async handleTransfer(transfer: IncomingTransfer): Promise<{ outcome: string }> {
    const now = this.clock.now();
    const { nombaRequestId, accountRef, amountMinor } = transfer;

    // Dedup: if already processed, return same outcome
    const existing = await this.inboundRepo.findByNombaRequestId(nombaRequestId);
    if (existing) return { outcome: existing.outcome };

    // Resolve VA → customer
    const va = await this.vaRepo.findByAccountRef(accountRef);
    if (!va) {
      await this.inboundRepo.create({
        id: `ite_${ulid()}`, nombaRequestId, accountRef, amountMinor,
        narration: transfer.narration, sessionId: transfer.sessionId,
        tenantId: null, customerId: null, invoiceId: null,
        outcome: 'suspense', createdAt: now,
      });
      await this.suspenseRepo.create({
        id: `sus_${ulid()}`, tenantId: null, amountMinor, accountRef,
        narration: transfer.narration, nombaRequestId, reason: 'no_va',
        resolvedAt: null, resolvedNote: null, createdAt: now,
      });
      return { outcome: 'suspense' };
    }

    const { tenantId, customerId } = va;

    // Find oldest payable invoice (open or partially_paid)
    const invoice = await this.invoiceRepo.findOldestPayable(tenantId, customerId);
    if (!invoice) {
      // No open invoice. If the customer has a pending (incomplete) subscription, this transfer is its
      // first payment → activate it (records the first-period paid invoice). Otherwise it's a genuine
      // advance/overpayment → credit the customer's balance.
      const activated = await this.activatePending(tenantId, customerId);
      if (activated > 0) {
        await this.inboundRepo.create({
          id: `ite_${ulid()}`, nombaRequestId, accountRef, amountMinor,
          narration: transfer.narration, sessionId: transfer.sessionId,
          tenantId, customerId, invoiceId: null,
          outcome: 'paid', createdAt: now,
        });
        return { outcome: 'paid' };
      }

      // No open invoice — credit to customer balance as advance payment
      await this.uow.run(async (tx) => {
        await this.postLedgerEntry.executeInTx({
          tenantId, customerId, type: 'payment_received',
          amountMinor, description: `Transfer credit: no open invoice — ${transfer.narration}`,
        }, tx);
        await this.eventRepo.append({
          id: `evt_${ulid()}`, tenantId, type: 'transfer.credited_to_balance',
          resourceType: 'customer', resourceId: customerId,
          payload: { customerId, amountMinor: amountMinor.toString(), nombaRequestId },
          occurredAt: now, createdAt: now,
        }, tx);
      });
      await this.inboundRepo.create({
        id: `ite_${ulid()}`, nombaRequestId, accountRef, amountMinor,
        narration: transfer.narration, sessionId: transfer.sessionId,
        tenantId, customerId, invoiceId: null,
        outcome: 'suspense', createdAt: now,
      });
      return { outcome: 'suspense' };
    }

    const shortfall = invoice.amountDueMinor - invoice.amountPaidMinor;

    let outcome: 'paid' | 'partial' | 'overpaid';

    if (amountMinor >= shortfall) {
      // Exact or over: mark invoice paid
      const overpayment = amountMinor - shortfall;
      outcome = overpayment > TOLERANCE_KOBO ? 'overpaid' : 'paid';

      await this.uow.run(async (tx) => {
        const lockedInvoice = await this.invoiceRepo.findForUpdate(tenantId, invoice.id, tx);
        if (!lockedInvoice || (lockedInvoice.state !== 'open' && lockedInvoice.state !== 'partially_paid')) return;

        await this.invoiceRepo.update({
          ...lockedInvoice,
          state:           'paid',
          amountPaidMinor: lockedInvoice.amountDueMinor,
          closedAt:        now,
          updatedAt:       now,
        }, tx);

        await this.postLedgerEntry.executeInTx({
          tenantId, customerId, type: 'payment_received',
          amountMinor: shortfall,
          invoiceId: invoice.id,
          description: `Transfer payment: invoice ${invoice.id}`,
        }, tx);

        if (overpayment > 0n) {
          await this.postLedgerEntry.executeInTx({
            tenantId, customerId, type: 'payment_received',
            amountMinor: overpayment,
            description: `Overpayment credit: ${overpayment} kobo above invoice ${invoice.id}`,
          }, tx);
        }

        await this.eventRepo.append({
          id: `evt_${ulid()}`, tenantId, type: 'invoice.paid',
          resourceType: 'invoice', resourceId: invoice.id,
          payload: { invoiceId: invoice.id, customerId, amountMinor: amountMinor.toString(), via: 'transfer' },
          occurredAt: now, createdAt: now,
        }, tx);
      });
    } else {
      // Short payment
      outcome = 'partial';

      await this.uow.run(async (tx) => {
        const lockedInvoice = await this.invoiceRepo.findForUpdate(tenantId, invoice.id, tx);
        if (!lockedInvoice || (lockedInvoice.state !== 'open' && lockedInvoice.state !== 'partially_paid')) return;

        await this.invoiceRepo.update({
          ...lockedInvoice,
          state:           'partially_paid',
          amountPaidMinor: lockedInvoice.amountPaidMinor + amountMinor,
          updatedAt:       now,
        }, tx);

        await this.postLedgerEntry.executeInTx({
          tenantId, customerId, type: 'payment_received',
          amountMinor,
          invoiceId: invoice.id,
          description: `Partial transfer payment: invoice ${invoice.id}`,
        }, tx);

        await this.eventRepo.append({
          id: `evt_${ulid()}`, tenantId, type: 'invoice.partially_paid',
          resourceType: 'invoice', resourceId: invoice.id,
          payload: {
            invoiceId: invoice.id, customerId, amountMinor: amountMinor.toString(),
            remaining: (shortfall - amountMinor).toString(),
          },
          occurredAt: now, createdAt: now,
        }, tx);
      });
    }

    await this.inboundRepo.create({
      id: `ite_${ulid()}`, nombaRequestId, accountRef, amountMinor,
      narration: transfer.narration, sessionId: transfer.sessionId,
      tenantId, customerId, invoiceId: invoice.id,
      outcome, createdAt: now,
    });

    // A fully-settled invoice may have been a dunning sub's overdue renewal — recover it to active.
    if (outcome === 'paid' || outcome === 'overpaid') {
      await this.recoverDunning(tenantId, customerId);
    }

    return { outcome };
  }

  async tieOut(tenantId: string): Promise<{
    suspenseCount: number;
    suspenseTotalMinor: string;
    unresolvedSuspenseCount: number;
  }> {
    const unresolved = await this.suspenseRepo.findUnresolved(tenantId);
    const total = unresolved.reduce((sum, s) => sum + s.amountMinor, 0n);
    return {
      suspenseCount:           unresolved.length,
      suspenseTotalMinor:      total.toString(),
      unresolvedSuspenseCount: unresolved.length,
    };
  }
}
