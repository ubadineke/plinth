import { z } from 'zod';

export const resolveSuspenseSchema = z.object({
  note: z.string().trim().min(1, 'Add a resolution note'),
});

export type ResolveSuspenseFormValues = z.infer<typeof resolveSuspenseSchema>;
