import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

test('invoices list renders rows with resolved customer names and filters by state', async ({ page }) => {
  await page.goto('/dashboard/invoices');
  await expect(page.getByText('Ada Obi')).toBeVisible();
  await expect(page.getByText(/\d+ invoices?/)).toBeVisible();

  await page.getByRole('button', { name: 'Paid', exact: true }).click();
  await expect(page.getByText('PAID').first()).toBeVisible();
  // Zainab Musa's invoice is the only VOID one — filtering to Paid should hide her row entirely.
  await expect(page.getByText('Zainab Musa')).not.toBeVisible();
});
