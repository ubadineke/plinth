import { z } from 'zod';

export const webhookEndpointSchema = z.object({
  url: z.string().trim().min(1, 'Endpoint URL is required').url('Enter a valid URL'),
  description: z.string().trim().optional(),
});

export type WebhookEndpointFormValues = z.infer<typeof webhookEndpointSchema>;
