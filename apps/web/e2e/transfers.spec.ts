import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

test('transfers page shows settled payments and the suspense queue', async ({ page }) => {
  await page.goto('/dashboard/transfers');
  await expect(page.getByRole('heading', { name: 'Settled Payments' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Suspense Queue/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resolve' }).first()).toBeVisible();
});

test('resolving a suspense item requires a note', async ({ page }) => {
  await page.goto('/dashboard/transfers');
  await page.getByRole('button', { name: 'Resolve' }).first().click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Add a resolution note')).toBeVisible();
});
