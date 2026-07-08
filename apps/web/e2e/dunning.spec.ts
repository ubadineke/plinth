import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

test('dunning board renders at-risk metrics and all four columns', async ({ page }) => {
  await page.goto('/dashboard/dunning');
  await expect(page.getByText('at risk in dunning')).toBeVisible();
  await expect(page.getByRole('heading', { name: /past due/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /grace period/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /delinquent/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /recovered/i })).toBeVisible();
});

test('sending a reminder updates only that row', async ({ page }) => {
  await page.goto('/dashboard/dunning');
  const reminders = page.getByRole('button', { name: 'Send reminder' });
  await expect(reminders.first()).toBeVisible();
  const remainingBefore = await reminders.count();

  await reminders.first().click();
  await expect(page.getByRole('button', { name: 'Reminder sent' })).toBeVisible();
  // Every other row's button is untouched — this mutation is scoped per-row.
  await expect(reminders).toHaveCount(remainingBefore - 1);
});
