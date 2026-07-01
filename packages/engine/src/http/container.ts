import { env } from '../config/env.js';
import { RealClock, TestClock } from '../adapters/clock.js';
import { FakeNombaAdapter, HttpNombaAdapter, type NombaAdapter } from '../adapters/nomba.js';
import { ConsoleNotifier } from '../adapters/notifier.js';
import { BullMQJobQueue, InMemoryJobQueue } from '../adapters/queue.js';
import type { JobQueue } from '../adapters/queue.js';
import { DrizzleUnitOfWork } from '../db/unit-of-work.js';
import { DrizzleTenantRepo } from '../db/tenant.repo.js';
import type { TenantRepo } from '../db/tenant.repo.js';
import { DrizzleCustomerRepo } from '../db/customer.repo.js';
import type { CustomerRepo } from '../db/customer.repo.js';
import { DrizzleLedgerRepo } from '../db/ledger.repo.js';
import type { LedgerRepo } from '../db/ledger.repo.js';
import { DrizzlePlanGroupRepo, DrizzlePlanRepo } from '../db/catalog.repo.js';
import type { PlanGroupRepo, PlanRepo } from '../db/catalog.repo.js';
import { DrizzleSubscriptionRepo } from '../db/subscription.repo.js';
import type { SubscriptionRepo } from '../db/subscription.repo.js';
import { DrizzleInvoiceRepo, type InvoiceRepo } from '../db/invoice.repo.js';
import { DrizzleEventRepo } from '../db/event.repo.js';
import { DrizzleTenantPolicyRepo } from '../db/policy.repo.js';
import { DrizzleScheduledChangeRepo } from '../db/scheduled-change.repo.js';
import type { ScheduledChangeRepo } from '../db/scheduled-change.repo.js';
import { DrizzleVirtualAccountRepo } from '../db/virtual-account.repo.js';
import { DrizzleInboundTransferRepo } from '../db/inbound-transfer.repo.js';
import { DrizzleSuspenseRepo } from '../db/suspense.repo.js';
import type { SuspenseRepo } from '../db/suspense.repo.js';
import { DrizzleDunningAttemptRepo } from '../db/dunning.repo.js';
import { CreateTenantService } from '../services/tenant.service.js';
import { PostLedgerEntryService } from '../services/ledger.service.js';
import { CreateCustomerService } from '../services/customer.service.js';
import { CreatePlanGroupService, CreatePlanService, UpdatePlanService, DeletePlanService } from '../services/catalog.service.js';
import { CreateSubscriptionService } from '../services/subscription.service.js';
import { FinalizeInvoiceService } from '../services/invoice.service.js';
import { RelayOutboxService } from '../services/outbox.service.js';
import { ChargeCardService, TickService } from '../services/billing.service.js';
import { PlanChangeService } from '../services/plan-change.service.js';
import { SubscriptionLifecycleService } from '../services/subscription-lifecycle.service.js';
import { ProvisionVirtualAccountService } from '../services/virtual-account.service.js';
import { TransferReconService } from '../services/transfer-recon.service.js';
import { EntitlementsService } from '../services/entitlements.service.js';
import { PolicyService } from '../services/policy.service.js';
import { SandboxService } from '../services/sandbox.service.js';
import { ApplicationService } from '../services/application.service.js';
import { AuthService } from '../services/auth.service.js';
import { NodemailerEmailService, NoopEmailService } from '../services/email.service.js';
import { DrizzleClaimTokenRepo } from '../db/claim-token.repo.js';
import { DrizzleApplicationRepo } from '../db/application.repo.js';
import { DrizzleCardTokenRepo } from '../db/card-token.repo.js';
import { CardTokenizationService } from '../services/card-token.service.js';

export interface Container {
  sandboxService: SandboxService;
  authService: AuthService;
  applicationService: ApplicationService;
  cardTokenService: CardTokenizationService;
  nomba: NombaAdapter;
  createTenantService: CreateTenantService;
  tenantRepo: TenantRepo;
  customerRepo: CustomerRepo;
  ledgerRepo: LedgerRepo;
  postLedgerEntryService: PostLedgerEntryService;
  createCustomerService: CreateCustomerService;
  createPlanGroupService: CreatePlanGroupService;
  createPlanService: CreatePlanService;
  updatePlanService: UpdatePlanService;
  deletePlanService: DeletePlanService;
  createSubscriptionService: CreateSubscriptionService;
  finalizeInvoiceService: FinalizeInvoiceService;
  relayOutboxService: RelayOutboxService;
  tickService: TickService;
  planChangeService: PlanChangeService;
  subscriptionLifecycleService: SubscriptionLifecycleService;
  provisionVaService: ProvisionVirtualAccountService;
  reconService: TransferReconService;
  subscriptionRepo: SubscriptionRepo;
  scheduledChangeRepo: ScheduledChangeRepo;
  planGroupRepo: PlanGroupRepo;
  planRepo: PlanRepo;
  invoiceRepo: InvoiceRepo;
  suspenseRepo: SuspenseRepo;
  jobQueue: JobQueue;
  entitlementsService: EntitlementsService;
  policyService: PolicyService;
  clock: RealClock | TestClock;
  close(): Promise<void>;
}

export function buildContainer(): Container {
  const clock = env.NODE_ENV === 'production' ? new RealClock() : new TestClock();
  const uow = new DrizzleUnitOfWork();

  const tenantRepo = new DrizzleTenantRepo();
  const customerRepo = new DrizzleCustomerRepo();
  const ledgerRepo = new DrizzleLedgerRepo();
  const planGroupRepo = new DrizzlePlanGroupRepo();
  const planRepo = new DrizzlePlanRepo();
  const subscriptionRepo = new DrizzleSubscriptionRepo();
  const invoiceRepo = new DrizzleInvoiceRepo();
  const eventRepo = new DrizzleEventRepo();
  const policyRepo = new DrizzleTenantPolicyRepo();
  const scheduledChangeRepo = new DrizzleScheduledChangeRepo();
  const virtualAccountRepo = new DrizzleVirtualAccountRepo();
  const inboundTransferRepo = new DrizzleInboundTransferRepo();
  const suspenseRepo = new DrizzleSuspenseRepo();
  const dunningRepo = new DrizzleDunningAttemptRepo();

  const nomba = env.USE_FAKE_NOMBA
    ? new FakeNombaAdapter()
    : new HttpNombaAdapter({
        baseUrl:            env.NOMBA_BASE_URL,
        clientId:           env.NOMBA_CLIENT_ID ?? '',
        clientSecret:       env.NOMBA_CLIENT_SECRET ?? '',
        accountId:          env.NOMBA_ACCOUNT_ID ?? '',
        webhookCallbackUrl: env.WEBHOOK_BASE_URL,
      });

  const jobQueue: JobQueue = env.REDIS_URL
    ? new BullMQJobQueue({ url: env.REDIS_URL })
    : new InMemoryJobQueue();

  void new ConsoleNotifier(); // Phase 8

  const createTenantService = new CreateTenantService(tenantRepo, uow, clock);
  const postLedgerEntryService = new PostLedgerEntryService(customerRepo, ledgerRepo, uow, clock);
  const createCustomerService = new CreateCustomerService(customerRepo, uow, clock);
  const createPlanGroupService = new CreatePlanGroupService(planGroupRepo, uow, clock);
  const createPlanService = new CreatePlanService(planGroupRepo, planRepo, uow, clock);
  const updatePlanService = new UpdatePlanService(planRepo, subscriptionRepo, uow, clock);
  const deletePlanService = new DeletePlanService(planRepo, subscriptionRepo, uow, clock);
  const createSubscriptionService = new CreateSubscriptionService(
    customerRepo, planRepo, subscriptionRepo, eventRepo, policyRepo, uow, clock,
  );
  const finalizeInvoiceService = new FinalizeInvoiceService(invoiceRepo, eventRepo, uow, clock);
  const webhookSecret = env.NOMBA_WEBHOOK_SECRET ?? 'dev-webhook-secret';
  const relayOutboxService = new RelayOutboxService(eventRepo, jobQueue, webhookSecret);
  const chargeCardService = new ChargeCardService(nomba);
  const tickService = new TickService(
    subscriptionRepo, invoiceRepo, eventRepo, planRepo,
    chargeCardService, postLedgerEntryService, scheduledChangeRepo,
    dunningRepo, policyRepo, uow, clock,
  );
  const entitlementsService = new EntitlementsService(subscriptionRepo, planRepo);
  const policyService = new PolicyService(policyRepo, clock);
  const planChangeService = new PlanChangeService(
    subscriptionRepo, planRepo, invoiceRepo, eventRepo,
    scheduledChangeRepo, policyRepo, chargeCardService, postLedgerEntryService, uow, clock,
  );
  const subscriptionLifecycleService = new SubscriptionLifecycleService(
    subscriptionRepo, policyRepo, scheduledChangeRepo, eventRepo, uow, clock,
  );
  const provisionVaService = new ProvisionVirtualAccountService(nomba, virtualAccountRepo, customerRepo, clock);
  const reconService = new TransferReconService(
    virtualAccountRepo, inboundTransferRepo, suspenseRepo, invoiceRepo,
    eventRepo, postLedgerEntryService, uow, clock,
  );

  const sandboxService = new SandboxService(
    tenantRepo, customerRepo, planGroupRepo, planRepo, eventRepo, uow, clock,
  );

  const emailService = env.SMTP_USER && env.SMTP_PASS
    ? new NodemailerEmailService(env.SMTP_USER, env.SMTP_PASS, env.SMTP_FROM_NAME)
    : new NoopEmailService();

  const claimTokenRepo = new DrizzleClaimTokenRepo();
  const authService = new AuthService(claimTokenRepo, new DrizzleApplicationRepo(), tenantRepo, emailService, clock, env.APP_BASE_URL);

  const applicationRepo = new DrizzleApplicationRepo();
  const applicationService = new ApplicationService(applicationRepo, tenantRepo, uow, clock, authService);

  const cardTokenRepo = new DrizzleCardTokenRepo();
  const cardTokenService = new CardTokenizationService(cardTokenRepo, customerRepo);

  return {
    sandboxService,
    authService,
    applicationService,
    cardTokenService,
    nomba,
    createTenantService,
    tenantRepo,
    customerRepo,
    ledgerRepo,
    postLedgerEntryService,
    createCustomerService,
    createPlanGroupService,
    createPlanService,
    updatePlanService,
    deletePlanService,
    createSubscriptionService,
    finalizeInvoiceService,
    relayOutboxService, 
    tickService,
    planChangeService,
    subscriptionLifecycleService,
    provisionVaService,
    reconService,
    subscriptionRepo,
    scheduledChangeRepo,
    planGroupRepo,
    planRepo,
    invoiceRepo,
    suspenseRepo,
    jobQueue,
    entitlementsService,
    policyService,
    clock,
    async close() {
      await jobQueue.close();
    },
  };
}
