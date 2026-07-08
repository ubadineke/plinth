// Half-up rounding for integer division (kobo arithmetic)
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error('Division by zero in proration');
  const q = numerator / denominator;
  const r = numerator % denominator;
  return r * 2n >= denominator ? q + 1n : q;
}

export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'lateral';
export type PlanChangeStrategy = 'immediate_prorated' | 'at_period_end';

export interface ProrationLineItem {
  type: 'proration_credit' | 'proration_charge';
  description: string;
  amountMinor: bigint; // credit is negative, charge is positive
}

export interface ProrationResult {
  direction: PlanChangeDirection;
  secondsTotal: bigint;
  secondsRemaining: bigint;
  unusedCreditMinor: bigint; // always >= 0
  newChargeMinor: bigint;    // always >= 0
  netMinor: bigint;           // > 0 = charge, < 0 = credit, 0 = neutral
  lineItems: ProrationLineItem[];
}

// §7 of proration-final-design.md: per-second granularity, kobo bigint, round half-up at final division.
export function computeProration(params: {
  oldAmountMinor: bigint;
  newAmountMinor: bigint;
  oldQuantity: number;
  newQuantity: number;
  periodStart: Date;
  periodEnd: Date;
  now: Date;
}): ProrationResult {
  const periodMs = params.periodEnd.getTime() - params.periodStart.getTime();
  // Clamp remaining time to [0, periodMs]. Remaining can never exceed one full period — without the
  // upper clamp, a `now` before periodStart (e.g. a clock/timeline mismatch) yields a ratio > 1 and
  // over-charges (the "₦22,000 to switch plans" bug). You can never be prorated more than a full period.
  const remainingMs = Math.min(
    Math.max(0, params.periodEnd.getTime() - params.now.getTime()),
    Math.max(0, periodMs),
  );

  const periodSeconds = BigInt(Math.floor(periodMs / 1000));
  const secondsRemaining = BigInt(Math.floor(remainingMs / 1000));

  const oldTotal = params.oldAmountMinor * BigInt(params.oldQuantity);
  const newTotal = params.newAmountMinor * BigInt(params.newQuantity);

  const unusedCreditMinor =
    periodSeconds > 0n ? roundHalfUp(oldTotal * secondsRemaining, periodSeconds) : 0n;
  const newChargeMinor =
    periodSeconds > 0n ? roundHalfUp(newTotal * secondsRemaining, periodSeconds) : 0n;

  const netMinor = newChargeMinor - unusedCreditMinor;

  const direction: PlanChangeDirection =
    newTotal > oldTotal ? 'upgrade' : newTotal < oldTotal ? 'downgrade' : 'lateral';

  const lineItems: ProrationLineItem[] = [];
  if (unusedCreditMinor > 0n) {
    lineItems.push({
      type: 'proration_credit',
      description: 'Unused time on current plan',
      amountMinor: -unusedCreditMinor,
    });
  }
  if (newChargeMinor > 0n) {
    lineItems.push({
      type: 'proration_charge',
      description: 'New plan for remaining period',
      amountMinor: newChargeMinor,
    });
  }

  return {
    direction,
    secondsTotal: periodSeconds,
    secondsRemaining,
    unusedCreditMinor,
    newChargeMinor,
    netMinor,
    lineItems,
  };
}
