import { z } from 'zod';

export const billingPolicySchema = z.object({
  upgradeStrategy: z.enum(['immediate_prorated', 'at_period_end']),
  downgradeStrategy: z.enum(['at_period_end', 'immediate_credit']),
  dunningChanges: z.enum(['gate_upgrades', 'block_all', 'allow_all']),
  graceDays: z.coerce.number().int().min(1, 'Must be between 1 and 30').max(30, 'Must be between 1 and 30'),
  maxDebt: z.coerce.number().min(0, 'Cannot be negative'),
  maxAttempts: z.coerce.number().int().min(1, 'Must be between 1 and 6').max(6, 'Must be between 1 and 6'),
  paydayDay: z.coerce.number().int().min(1, 'Must be between 1 and 31').max(31, 'Must be between 1 and 31'),
});
export type BillingPolicyFormInput = z.input<typeof billingPolicySchema>;
export type BillingPolicyFormValues = z.output<typeof billingPolicySchema>;

export const sendTestNotificationSchema = z.object({
  channel: z.enum(['sms', 'email']),
  to: z.string().trim().min(1, 'Enter a recipient'),
});
export type SendTestNotificationFormValues = z.infer<typeof sendTestNotificationSchema>;
