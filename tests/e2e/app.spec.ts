import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('creates two boundaries and keeps their lists separate', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Boundaries & data' });
  await settings.getByLabel('New boundary name').fill('Home');
  await settings.getByRole('button', { name: 'Add boundary' }).click();
  await page.getByRole('dialog', { name: 'Boundaries & data' }).getByLabel('New boundary name').fill('Cabin');
  await page.getByRole('dialog', { name: 'Boundaries & data' }).getByRole('button', { name: 'Add boundary' }).click();
  await expect(page.getByRole('dialog', { name: 'Boundaries & data' }).locator('input[value="Cabin"]')).toBeVisible();
  await page.getByRole('dialog', { name: 'Boundaries & data' }).getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Add meal on Monday' }).click();
  await page.getByRole('dialog', { name: 'Add to Monday' }).getByLabel('Meal name').fill('Pasta');
  await page.getByRole('dialog', { name: 'Add to Monday' }).getByLabel('Ingredients, one per line').fill('Basil\n2 cans tomatoes');
  await page.getByRole('dialog', { name: 'Add to Monday' }).getByRole('button', { name: 'Save meal' }).click();

  await page.getByRole('button', { name: 'Add meal on Tuesday' }).click();
  const mealDialog = page.getByRole('dialog', { name: 'Add to Tuesday' });
  await mealDialog.getByLabel('Meal name').fill('Cabin soup');
  await mealDialog.getByLabel('Boundary').selectOption({ label: '◇ Cabin' });
  await mealDialog.getByLabel('Ingredients, one per line').fill('Basil\nBread');
  await mealDialog.getByRole('button', { name: 'Save meal' }).click();

  await page.getByRole('button', { name: /Lists/ }).click();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cabin', exact: true })).toBeVisible();
  const sheets = page.locator('.list-sheet');
  await expect(sheets).toHaveCount(2);
  await expect(sheets.nth(0).getByText('Basil', { exact: true })).toBeVisible();
  await expect(sheets.nth(1).getByText('Basil', { exact: true })).toBeVisible();

  await sheets.nth(0).getByRole('button', { name: 'Show QR' }).click();
  const qrDialog = page.getByRole('dialog', { name: 'Scan this boundary' });
  await expect(qrDialog.locator('canvas')).toBeVisible();
  const shareUrl = await qrDialog.getByRole('button', { name: 'Copy link' }).getAttribute('data-url');
  expect(shareUrl).toContain('?share=');
  await qrDialog.getByRole('button', { name: 'Done' }).click();
  const handoff = await page.context().newPage();
  await handoff.goto(shareUrl!);
  await expect(handoff.getByRole('heading', { level: 1, name: /Home shopping list/ })).toBeVisible();
  await expect(handoff.getByText('Cabin soup')).toHaveCount(0);
  await handoff.close();

  await sheets.nth(0).getByRole('checkbox').first().check();
  await page.reload();
  await page.getByRole('button', { name: /Lists/ }).click();
  await expect(page.locator('.list-sheet').nth(0).getByRole('checkbox').first()).toBeChecked();
  expect(consoleErrors).toEqual([]);
});

test('home screen has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('works at 390px without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only layout check');
  await page.goto('/');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
  await expect(page.getByRole('button', { name: 'Open settings' })).toBeVisible();
});

test('reloads the cached planner while offline', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'chromium', 'one browser is enough for the service worker check');
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.waitForTimeout(1000);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /One week/ })).toBeVisible();
  await expect(page.getByText(/Offline · changes stay here/)).toBeAttached();
  await context.setOffline(false);
});
