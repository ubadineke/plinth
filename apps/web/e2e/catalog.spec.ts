import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

test('catalog shows plans and the active billing preset', async ({ page }) => {
  await page.goto('/dashboard/catalog');
  await expect(page.getByRole('heading', { name: 'Nollybox Plans' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Basic' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SaaS-Standard' })).toBeVisible();
  await expect(page.getByText('active').first()).toBeVisible();
});

test('add plan group form requires a name before submitting', async ({ page }) => {
  await page.goto('/dashboard/catalog');
  await page.getByRole('button', { name: 'Add Plan Group' }).click();
  await expect(page.getByRole('heading', { name: 'Add plan group' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create group' })).toBeDisabled();
});
