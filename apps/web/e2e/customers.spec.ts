import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

test('customers list renders rows and filters via search', async ({ page }) => {
  await page.goto('/dashboard/customers');
  await expect(page.getByRole('link', { name: 'Ada Obi' })).toBeVisible();
  await expect(page.getByText(/\d+ customers? total/)).toBeVisible();

  await page.getByPlaceholder('Search customers…').fill('chidi');
  await expect(page.getByRole('link', { name: 'Chidi Nwosu' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ada Obi' })).not.toBeVisible();
});

test('add customer form validates and auto-suggests the external ref', async ({ page }) => {
  await page.goto('/dashboard/customers');
  await page.getByRole('button', { name: 'Add customer' }).click();

  const submit = page.getByRole('button', { name: 'Create customer' });
  await expect(submit).toBeDisabled();

  await page.getByLabel('Name').fill('Acme Studios');
  await page.getByLabel('Email').fill('billing@acmestudios.com');
  await expect(page.getByLabel('External Ref')).toHaveValue('billing');
  await expect(submit).toBeEnabled();
});

test('customer detail page shows profile, virtual account, and access', async ({ page }) => {
  await page.goto('/dashboard/customers/cus_ada');
  await expect(page.getByRole('heading', { name: 'Ada Obi', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Virtual account' })).toBeVisible();
  await expect(page.getByText('Nombank MFB')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Access' })).toBeVisible();
});
