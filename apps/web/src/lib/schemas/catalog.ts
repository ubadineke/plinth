import { z } from 'zod';

export const planGroupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().optional(),
});
export type PlanGroupFormValues = z.infer<typeof planGroupSchema>;

const BILLING_INTERVALS = ['day', 'week', 'month', 'year'] as const;

export const planSchema = z.object({
  planGroupId: z.string().min(1, 'Select a plan group'),
  name: z.string().trim().min(1, 'Name is required'),
  amountNaira: z.coerce.number().positive('Amount must be greater than 0'),
  interval: z.enum(BILLING_INTERVALS),
  intervalCount: z.coerce.number().int().min(1, 'Must be at least 1'),
  trialDays: z.coerce.number().int().min(0, 'Cannot be negative'),
  lookupKey: z
    .string()
    .trim()
    .min(1, 'Lookup key is required')
    .regex(/^[a-z0-9_]+$/, 'Lowercase letters, numbers, and underscores only'),
});
export type PlanFormInput = z.input<typeof planSchema>;
export type PlanFormValues = z.output<typeof planSchema>;

export const editPlanSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  amountNaira: z.coerce.number().positive('Amount must be greater than 0'),
  interval: z.enum(BILLING_INTERVALS),
  intervalCount: z.coerce.number().int().min(1, 'Must be at least 1'),
  trialDays: z.coerce.number().int().min(0, 'Cannot be negative'),
});
export type EditPlanFormInput = z.input<typeof editPlanSchema>;
export type EditPlanFormValues = z.output<typeof editPlanSchema>;
