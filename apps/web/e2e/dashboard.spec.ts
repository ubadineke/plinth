import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Pre-seed auth + skip the first-run tour/quickstart so these tests
  // exercise the steady-state UI, not the onboarding overlay (that has its
  // own dedicated spec).
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

test('overview shows live MRR, needs-attention, and full sidebar nav', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Monthly recurring revenue')).toBeVisible();
  await expect(page.getByText('Needs attention')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Subscriptions' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
});

test('sidebar navigation moves between sections', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: 'Customers' }).click();
  await expect(page).toHaveURL(/\/dashboard\/customers$/);

  await page.getByRole('link', { name: 'Webhooks' }).click();
  await expect(page).toHaveURL(/\/dashboard\/webhooks$/);
});
