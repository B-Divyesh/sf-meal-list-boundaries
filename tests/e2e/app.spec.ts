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

test('@claim:demo-sandbox runs sample data separately from the real planner', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.locator('.demo-banner')).toContainText('Demo — sample data');
  await expect(page.getByText('Pasta night')).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Pasta night')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Name the places you shop for' })).toBeVisible();
});

test('@claim:local-only-data keeps a sample planning flow on the product origin', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo');
  await page.getByRole('button', { name: /Lists/ }).click();
  await page.getByRole('checkbox').first().check();
  const productOrigin = new URL(page.url()).origin;
  expect(requests.filter((url) => url.startsWith('http')).every((url) => new URL(url).origin === productOrigin)).toBe(true);
});

test('does not carry a gathered ingredient into the next week', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Boundaries & data' });
  await settings.getByLabel('New boundary name').fill('Home');
  await settings.getByRole('button', { name: 'Add boundary' }).click();
  await page.getByRole('dialog', { name: 'Boundaries & data' }).getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Add meal on Monday' }).click();
  const firstMeal = page.getByRole('dialog', { name: 'Add to Monday' });
  await firstMeal.getByLabel('Meal name').fill('Week one dinner');
  await firstMeal.getByLabel('Ingredients, one per line').fill('Basil');
  await firstMeal.getByRole('button', { name: 'Save meal' }).click();
  await page.getByRole('button', { name: /Lists/ }).click();
  await page.getByRole('checkbox', { name: /Basil/ }).check();

  await page.getByRole('button', { name: 'Next week' }).click();
  await page.locator('[data-view="plan"]').click();
  await page.getByRole('button', { name: 'Add meal on Monday' }).click();
  const nextMeal = page.getByRole('dialog', { name: 'Add to Monday' });
  await nextMeal.getByLabel('Meal name').fill('Week two dinner');
  await nextMeal.getByLabel('Ingredients, one per line').fill('Basil');
  await nextMeal.getByRole('button', { name: 'Save meal' }).click();
  await page.getByRole('button', { name: /Lists/ }).click();

  await expect(page.getByText('0 of 1 gathered')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Basil/ })).not.toBeChecked();
});

test('works at 390px without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only layout check');
  await page.goto('/');
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
  await expect(page.getByRole('button', { name: 'Open settings' })).toBeVisible();
});

test('keeps core action targets at least 44px at 390px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only target-size check');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Boundaries & data' });
  await settings.getByLabel('New boundary name').fill('Home');
  await settings.getByRole('button', { name: 'Add boundary' }).click();
  await expect(settings.getByRole('button', { name: 'Save' })).toHaveJSProperty('offsetHeight', 44);
  await expect(settings.getByRole('button', { name: 'Remove' })).toHaveJSProperty('offsetHeight', 44);
  await settings.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Add meal on Monday' }).click();
  const meal = page.getByRole('dialog', { name: 'Add to Monday' });
  await meal.getByLabel('Meal name').fill('Pasta');
  await meal.getByLabel('Ingredients, one per line').fill('Basil');
  await meal.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveJSProperty('offsetHeight', 44);
  await expect(page.getByRole('button', { name: 'Remove' })).toHaveJSProperty('offsetHeight', 44);
});

test('@claim:offline-reload reloads the cached planner while offline', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'chromium', 'one browser is enough for the service worker check');
  await page.goto('/demo');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.waitForTimeout(1000);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /One week/ })).toBeVisible();
  await expect(page.getByText(/Offline · changes stay here/)).toBeAttached();
  await context.setOffline(false);
});
