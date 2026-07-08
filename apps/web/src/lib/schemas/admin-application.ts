import { z } from 'zod';

export const rejectApplicationSchema = z.object({
  reason: z.string().trim().min(1, 'A rejection reason is required'),
});

export type RejectApplicationFormValues = z.infer<typeof rejectApplicationSchema>;
