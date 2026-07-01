import type {
  SubscriptionRepo,
  Subscription,
  SubscriptionState,
} from '../../src/db/subscription.repo.js';
import type { TxContext } from '../../src/db/unit-of-work.js';

export class InMemorySubscriptionRepo implements SubscriptionRepo {
  private store = new Map<string, Subscription>();

  seed(sub: Subscription): void {
    this.store.set(sub.id, sub);
  }

  all(): Subscription[] {
    return [...this.store.values()];
  }

  async findById(_tenantId: string, id: string, _tx?: TxContext): Promise<Subscription | null> {
    return this.store.get(id) ?? null;
  }

  async findForUpdate(_tenantId: string, id: string, _tx: TxContext): Promise<Subscription | null> {
    return this.store.get(id) ?? null;
  }

  async findDueForBilling(tenantId: string, asOf: Date, _tx?: TxContext): Promise<Subscription[]> {
    return [...this.store.values()].filter(
      (s) => s.tenantId === tenantId && s.state === 'active' && s.nextBillAt <= asOf,
    );
  }

  async findTrialsEnding(tenantId: string, asOf: Date, _tx?: TxContext): Promise<Subscription[]> {
    return [...this.store.values()].filter(
      (s) =>
        s.tenantId === tenantId &&
        s.state === 'trialing' &&
        s.trialEndAt !== null &&
        s.trialEndAt <= asOf,
    );
  }

  async create(subscription: Subscription, _tx?: TxContext): Promise<void> {
    this.store.set(subscription.id, subscription);
  }

  async updateState(
    _tenantId: string,
    id: string,
    state: SubscriptionState,
    updatedAt: Date,
    _tx: TxContext,
  ): Promise<void> {
    const sub = this.store.get(id);
    if (sub) this.store.set(id, { ...sub, state, updatedAt });
  }

  async findByState(tenantId: string, state: SubscriptionState): Promise<Subscription[]> {
    return [...this.store.values()].filter(
      (s) => s.tenantId === tenantId && s.state === state,
    );
  }

  async findByCustomer(tenantId: string, customerId: string): Promise<Subscription[]> {
    return [...this.store.values()].filter(
      (s) => s.tenantId === tenantId && s.customerId === customerId,
    );
  }

  async update(subscription: Subscription, _tx: TxContext): Promise<void> {
    this.store.set(subscription.id, subscription);
  }
}
