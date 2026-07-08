import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nomba_api_key', 'mock');
    localStorage.setItem('nomba_tenant_id', 'ten_mock_nollybox');
    localStorage.setItem('plinth_tour_dashboard_v1_done', 'true');
    localStorage.setItem('plinth_quickstart_dismissed', 'true');
  });
});

const PAGES = ['/login', '/dashboard', '/dashboard/settings', '/dashboard/subscriptions'];

for (const path of PAGES) {
  test(`${path} has no serious or critical WCAG 2 A/AA violations`, async ({ page }) => {
    await page.goto(path);
    // Let mount transitions (row/card fade-ins, ~0.35–0.6s) settle first —
    // axe reads computed styles at the instant it runs, and scanning
    // mid-animation reports the transient (still-fading) color, not the
    // steady-state one.
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
