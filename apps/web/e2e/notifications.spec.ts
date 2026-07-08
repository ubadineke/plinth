import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

test('notifications list renders and search filters by customer', async ({ page }) => {
  await page.goto('/dashboard/notifications');
  await expect(page.getByText(/\d+ notifications?/)).toBeVisible();
  await expect(page.getByText('PAYMENT DUE')).toBeVisible();

  await page.getByPlaceholder('Search customer, event, message…').fill('zainab');
  await expect(page.getByText('Zainab Musa')).toBeVisible();
  await expect(page.getByText('PAYMENT DUE')).not.toBeVisible();
});
