import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  planId: z.string().min(1, 'Select a plan'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  rail: z.enum(['card', 'transfer', 'direct_debit']),
});

// z.coerce.number() means the field's pre-parse input type is `unknown` (it
// accepts anything coercible) while its parsed output is `number` — RHF's
// useForm needs both: TFieldValues (input) for defaultValues/register, and
// TTransformedValues (output) for what handleSubmit's callback receives.
export type CreateSubscriptionFormInput = z.input<typeof createSubscriptionSchema>;
export type CreateSubscriptionFormValues = z.output<typeof createSubscriptionSchema>;
