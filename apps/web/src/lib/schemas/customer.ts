import { z } from 'zod';

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  externalRef: z.string().trim().min(1, 'External ref is required'),
  phone: z.string().trim().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
