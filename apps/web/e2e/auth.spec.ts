import { test, expect } from '@playwright/test';

test('logging in via mock mode reaches the dashboard', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Plinth' })).toBeVisible();

  await page.getByRole('button', { name: 'Enter dashboard →' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
});
