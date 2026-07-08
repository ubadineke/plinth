import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

test('settings page loads tenant, API key, and webhook sections', async ({ page }) => {
  await page.goto('/dashboard/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tenant' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'API Keys' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Webhooks' }).first()).toBeVisible();
});
