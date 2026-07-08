import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
  });
});

/**
 * driver.js silently drops next/prev clicks that land while a step
 * transition (scroll + reposition) is still in flight — it guards on an
 * internal `__transitionCallback` lock. Clicking on a fixed short delay
 * (e.g. 150ms) races that lock and drops most clicks. Waiting for the
 * progress text to actually advance ties this to real state instead.
 */
async function clickThroughStep(page: Page, expectedNext: string) {
  const nextOrDone = page.locator('.driver-popover-next-btn, .driver-popover-done-btn');
  await nextOrDone.click();
  await expect(page.locator('.driver-popover-progress-text')).toHaveText(expectedNext, {
    timeout: 5000,
  });
}

test('first-run spotlight tour appears, steps through, and persists completion', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByText('Welcome to Plinth')).toBeVisible();
  await expect(page.locator('.driver-popover-progress-text')).toHaveText('1 of 8');

  for (let step = 2; step <= 8; step++) {
    await clickThroughStep(page, `${step} of 8`);
  }

  // The "Done" click destroys the tour rather than advancing progress text,
  // so there's no text signal to wait on — and it's just as susceptible to
  // driver.js's transition-lock dropping a click that lands too soon after
  // the previous one. Retry until the popover is actually gone.
  await expect(async () => {
    if ((await page.locator('.driver-popover').count()) > 0) {
      await page.locator('.driver-popover-next-btn, .driver-popover-done-btn').click();
    }
    expect(await page.locator('.driver-popover').count()).toBe(0);
  }).toPass({ timeout: 5000 });
  await expect(async () => {
    const done = await page.evaluate(() => localStorage.getItem('plinth_tour_dashboard_v1_done'));
    expect(done).toBe('true');
  }).toPass({ timeout: 3000 });

  // A fresh load must not show it again.
  await page.reload();
  await expect(page.getByText('Welcome to Plinth')).not.toBeVisible();
});

test('closing the tour early still marks it complete (does not nag again)', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Welcome to Plinth')).toBeVisible();

  await page.locator('.driver-popover-close-btn').click();
  await expect(page.locator('.driver-popover')).toHaveCount(0);

  await expect(async () => {
    const done = await page.evaluate(() => localStorage.getItem('plinth_tour_dashboard_v1_done'));
    expect(done).toBe('true');
  }).toPass({ timeout: 3000 });
});
