import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

test('webhook endpoints list renders and expands deliveries', async ({ page }) => {
  await page.goto('/dashboard/webhooks');
  await expect(page.getByText('https://api.nollybox.tv/webhooks/plinth')).toBeVisible();
  await expect(page.getByText(/\d+ endpoints?/)).toBeVisible();

  await page.getByRole('button', { name: 'Show deliveries' }).first().click();
  await expect(page.getByText(/succeeded/i).first()).toBeVisible();
});

test('add endpoint form requires a valid URL', async ({ page }) => {
  await page.goto('/dashboard/webhooks');
  await page.getByRole('button', { name: 'Add endpoint' }).click();
  const submit = page.getByRole('button', { name: 'Create endpoint' });
  await expect(submit).toBeDisabled();

  await page.getByLabel('Endpoint URL').fill('https://example.com/webhook');
  await expect(submit).toBeEnabled();
});
