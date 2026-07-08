import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api } from './api';

/**
 * Exercises `request()`'s error-message surfacing (added in the reliability
 * pass — toasts should show the server's real message, not a generic
 * "Request failed (500)"). `request` itself isn't exported, so we go
 * through a real endpoint (`api.me.get`) with `fetch` mocked; NEXT_PUBLIC_USE_MOCKS
 * is unset in the test env, so `api` resolves to the real implementation.
 */
describe('api request error handling', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('resolves with the parsed JSON body on success', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 't_1', name: 'Acme', created_at: '2026-01-01' }),
    });
    await expect(api.me.get()).resolves.toEqual({
      id: 't_1',
      name: 'Acme',
      created_at: '2026-01-01',
    });
  });

  it('surfaces the server\'s "error" field when present', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'email is already in use' }),
    });
    await expect(api.me.get()).rejects.toThrow('email is already in use');
  });

  it('falls back to "message" field when "error" is absent', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'invalid customer id' }),
    });
    await expect(api.me.get()).rejects.toThrow('invalid customer id');
  });

  it('falls back to a generic status message when the body is not JSON', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new SyntaxError('Unexpected end of JSON input');
      },
    });
    await expect(api.me.get()).rejects.toThrow('Request failed (503)');
  });
});
