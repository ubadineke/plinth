// Typed domain error hierarchy — never HTTP-aware. HTTP shape lives in error.middleware.ts.
// [S56][S57] — engineering-standards Area 8

export type ErrorType =
  | 'card_error'
  | 'invalid_request_error'
  | 'idempotency_error'
  | 'reconciliation_error'
  | 'api_error';

export class DomainError extends Error {
  readonly type: ErrorType;
  readonly code: string;
  readonly param?: string;

  constructor(type: ErrorType, code: string, message: string, param?: string) {
    super(message);
    this.name = 'DomainError';
    this.type = type;
    this.code = code;
    if (param !== undefined) this.param = param;
  }
}

export class InvalidRequestError extends DomainError {
  constructor(code: string, message: string, param?: string) {
    super('invalid_request_error', code, message, param);
    this.name = 'InvalidRequestError';
  }
}

// 409 — a conflicting resource already exists (e.g. the customer already has a live subscription).
// Carries the conflicting resource id so integrators can reuse it instead of retrying.
export class ConflictError extends DomainError {
  readonly existingId?: string | undefined;
  constructor(code: string, message: string, existingId?: string) {
    super('invalid_request_error', code, message);
    this.name = 'ConflictError';
    this.existingId = existingId;
  }
}

export class IdempotencyConflictError extends DomainError {
  constructor(message = 'Idempotency-Key reused with a different request body') {
    super('idempotency_error', 'idempotency_conflict', message);
    this.name = 'IdempotencyConflictError';
  }
}

export class CardError extends DomainError {
  readonly declineCode?: string;

  constructor(code: string, message: string, declineCode?: string) {
    super('card_error', code, message);
    this.name = 'CardError';
    if (declineCode !== undefined) this.declineCode = declineCode;
  }
}

export class ReconciliationError extends DomainError {
  constructor(code: string, message: string) {
    super('reconciliation_error', code, message);
    this.name = 'ReconciliationError';
  }
}

export class ApiError extends DomainError {
  constructor(code: string, message: string) {
    super('api_error', code, message);
    this.name = 'ApiError';
  }
}

export class NotImplementedError extends ApiError {
  constructor(feature: string) {
    super('not_implemented', `${feature} is not yet implemented`);
    this.name = 'NotImplementedError';
  }
}

export class StrategyNotSupportedError extends InvalidRequestError {
  constructor(strategy: string) {
    super(
      'strategy_not_yet_supported',
      `Upgrade strategy '${strategy}' is designed but not yet implemented. Use 'immediate_prorated' or 'at_period_end'.`,
      'upgrade_strategy',
    );
    this.name = 'StrategyNotSupportedError';
  }
}

export class NotFoundError extends InvalidRequestError {
  constructor(resource: string, id: string) {
    super('resource_not_found', `${resource} '${id}' not found`);
    this.name = 'NotFoundError';
  }
}

export class StateTransitionError extends InvalidRequestError {
  constructor(from: string, to: string) {
    super('illegal_state_transition', `illegal_state_transition: Cannot transition from '${from}' to '${to}'`, 'state');
    this.name = 'StateTransitionError';
  }
}

export class InvoiceFinalizedError extends InvalidRequestError {
  constructor(currentState: string) {
    super('invoice_finalized', `invoice_finalized: Invoice is '${currentState}' and can no longer be modified`);
    this.name = 'InvoiceFinalizedError';
  }
}

export class PlanInactiveError extends InvalidRequestError {
  constructor(planId: string) {
    super('plan_inactive', `plan_inactive: Plan '${planId}' is not active and cannot be subscribed to`, 'plan_id');
    this.name = 'PlanInactiveError';
  }
}

export class PlanImmutableError extends InvalidRequestError {
  constructor(field: string) {
    super(
      'plan_immutable',
      `Cannot change ${field} on a plan that already has subscriptions. Create a new plan and migrate subscribers instead.`,
      field,
    );
    this.name = 'PlanImmutableError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Invalid or missing API key') {
    super('api_error', 'unauthorized', message);
    this.name = 'UnauthorizedError';
  }
}
