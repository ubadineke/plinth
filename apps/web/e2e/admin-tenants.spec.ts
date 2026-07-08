import { test, expect } from '@playwright/test';

test('tenant applications list renders and the review drawer opens', async ({ page }) => {
  await page.goto('/admin/tenants');
  await expect(page.getByRole('heading', { name: 'Tenant Applications' })).toBeVisible();
  await expect(page.getByText('Naija Streams')).toBeVisible();
  await expect(page.getByText('Pending review')).toBeVisible();

  await page.getByRole('button', { name: 'Review' }).first().click();
  await expect(page.getByRole('heading', { name: 'APPLICANT' })).toBeVisible();
});

test('rejecting an application requires a reason', async ({ page }) => {
  await page.goto('/admin/tenants');
  await page.getByRole('button', { name: 'Review' }).first().click();
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm rejection' }).click();
  await expect(page.getByText('A rejection reason is required')).toBeVisible();
});
