import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  businessName: z.string().trim().min(1, 'Required'),
  contactName: z.string().trim().min(1, 'Required'),
  email: z.string().trim().min(1, 'Valid email required').email('Valid email required'),
  rcNumber: z.string().trim().optional(),
  website: z.string().trim().optional(),
  description: z.string().trim().min(20, 'Tell us a bit more (at least 20 characters)'),
});
export type SignupFormValues = z.infer<typeof signupSchema>;
