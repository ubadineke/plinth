import { Hono } from 'hono';
import type { AuthService } from '../../services/auth.service.js';
import { env } from '../../config/env.js';

export function makeAuthRouter(authService: AuthService): Hono {
  const router = new Hono();

  router.post('/demo', async (c) => {
    if (!env.DEMO_API_KEY) return c.json({ error: 'Demo mode not configured on this server' }, 503);
    try {
      const result = await authService.demoSession(env.DEMO_API_KEY);
      return c.json({ object: 'session', tenant_id: result.tenantId, api_key: result.apiKey });
    } catch (err: any) {
      return c.json({ error: err.message }, 404);
    }
  });

  router.post('/claim', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.token) return c.json({ error: 'token is required' }, 400);
    try {
      const result = await authService.validateClaimToken(body.token);
      return c.json({ object: 'session', tenant_id: result.tenantId, api_key: result.apiKey });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  router.post('/magic-link', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body?.email) return c.json({ error: 'email is required' }, 400);
    try {
      await authService.sendMagicLink(body.email);
      return c.json({ object: 'magic_link', sent: true });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  });

  return router;
}
