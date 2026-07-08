import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(3000),

  NOMBA_CLIENT_ID: z.string().optional(),
  NOMBA_CLIENT_SECRET: z.string().optional(),
  NOMBA_ACCOUNT_ID: z.string().optional(),
  NOMBA_SUB_ACCOUNT_ID: z.string().optional(),
  NOMBA_BASE_URL: z.string().url().default('https://sandbox.nomba.com'),
  NOMBA_WEBHOOK_SECRET: z.string().optional(),

  // Prod mirrors every inbound Nomba webhook here (fire-and-forget) so it can still be observed
  // from a local dev tunnel without ever re-registering the webhook URL with Nomba. e.g.
  // https://dev-api.useplinth.xyz/webhooks/nomba
  DEV_WEBHOOK_FORWARD_URL: z.string().url().optional(),

  USE_FAKE_NOMBA: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  ADMIN_SECRET: z.string().optional(),
  DOCS_SHARED_API_KEY: z.string().optional(),
  CHECKOUT_CALLBACK_URL: z.string().url().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default('Plinth'),

  APP_BASE_URL: z.string().url().default('http://localhost:3000'),

  // Public URL where Nomba posts webhooks (the cloudflared tunnel → this engine).
  // Used as the callbackUrl on tokenized-card charges and to document the webhook destination.
  WEBHOOK_BASE_URL: z.string().url().default('https://api.useplinth.xyz'),

  // How often the outbound-webhook dispatcher runs (fan-out + deliver due retries).
  WEBHOOK_DISPATCH_INTERVAL_MS: z.coerce.number().int().positive().default(3000),

  // Twilio SMS (customer notifications). Without creds, notifications log via the Noop adapter.
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[config] Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

export const env: Env = parseEnv();
