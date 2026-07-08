import { test, expect } from '@playwright/test';

test('signup form validates required fields before submitting', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Submit application →' }).click();

  // "Required" is checked exact — a loose substring match also catches the
  // page's static "No card required" copy and "Valid email required".
  await expect(page.getByText('Required', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Valid email required')).toBeVisible();
  await expect(page.getByText('Tell us a bit more (at least 20 characters)')).toBeVisible();
});

test('signup submits and shows the confirmation screen', async ({ page }) => {
  await page.goto('/signup');
  await page.getByPlaceholder('Acme Technologies Ltd').fill('Naija Fit Studio');
  await page.getByPlaceholder('Tunde Ogunyemi').fill('Amaka Chukwu');
  await page.getByPlaceholder('billing@acme.ng').fill('amaka@naijafit.ng');
  await page.getByPlaceholder(/Describe your product/).fill(
    'We run a chain of fitness studios and need recurring monthly billing for our membership tiers.',
  );
  await page.getByRole('button', { name: 'Submit application →' }).click();

  await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible();
  await expect(page.getByText('Naija Fit Studio')).toBeVisible();
});

test('claim page shows an error when the link has no token', async ({ page }) => {
  await page.goto('/claim');
  await expect(page.getByRole('heading', { name: 'Link invalid' })).toBeVisible();
  await expect(page.getByText('No claim token found in this link.')).toBeVisible();
});

test('claim page redeems a token and redirects to the dashboard', async ({ page }) => {
  await page.goto('/claim?token=mock-token');
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5000 });
});
