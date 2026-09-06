import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function streamText(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

test('@claim:list-separation creates separate lists and combines duplicates only within one list', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Places & data' });
  await settings.getByLabel('New place name').fill('Home');
  await settings.getByRole('button', { name: 'Add place' }).click();
  await page.getByRole('dialog', { name: 'Places & data' }).getByLabel('New place name').fill('Cabin');
  await page.getByRole('dialog', { name: 'Places & data' }).getByRole('button', { name: 'Add place' }).click();
  await expect(page.getByRole('dialog', { name: 'Places & data' }).locator('input[value="Cabin"]')).toBeVisible();
  await page.getByRole('dialog', { name: 'Places & data' }).getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Add meal on Monday' }).click();
  await page.getByRole('dialog', { name: 'Add to Monday' }).getByLabel('Meal name').fill('Pasta');
  await page.getByRole('dialog', { name: 'Add to Monday' }).getByLabel('Ingredients, one per line').fill('Basil\n basil \n2 cans tomatoes');
  await page.getByRole('dialog', { name: 'Add to Monday' }).getByRole('button', { name: 'Save meal' }).click();

  await page.getByRole('button', { name: 'Add meal on Tuesday' }).click();
  const mealDialog = page.getByRole('dialog', { name: 'Add to Tuesday' });
  await mealDialog.getByLabel('Meal name').fill('Cabin soup');
  await mealDialog.getByLabel('Shopping list').selectOption({ label: '◇ Cabin' });
  await mealDialog.getByLabel('Ingredients, one per line').fill('Basil\nBread');
  await mealDialog.getByRole('button', { name: 'Save meal' }).click();

  await page.getByRole('button', { name: /Lists/ }).click();
  await expect(page.getByRole('heading', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cabin', exact: true })).toBeVisible();
  const sheets = page.locator('.list-sheet');
  await expect(sheets).toHaveCount(2);
  await expect(sheets.nth(0).getByText('Basil', { exact: true })).toBeVisible();
  await expect(sheets.nth(0).getByText('× 2')).toBeVisible();
  await expect(sheets.nth(0).getByText('Bread', { exact: true })).toHaveCount(0);
  await expect(sheets.nth(1).getByText('Basil', { exact: true })).toBeVisible();
  await expect(sheets.nth(1).getByText('2 cans tomatoes', { exact: true })).toHaveCount(0);

  await sheets.nth(0).getByRole('button', { name: 'Show QR' }).click();
  const qrDialog = page.getByRole('dialog', { name: 'Scan to open this list' });
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
  await page.goto('/');
  await page.getByRole('button', { name: 'Open settings' }).click();
  const realSettings = page.getByRole('dialog', { name: 'Places & data' });
  await realSettings.getByLabel('New place name').fill('Real home');
  await realSettings.getByRole('button', { name: 'Add place' }).click();
  await page.getByRole('dialog', { name: 'Places & data' }).getByRole('button', { name: 'Done' }).click();
  await page.goto('/demo');
  await expect(page.locator('.demo-banner')).toContainText('Demo — sample data');
  await expect(page.getByText('Pasta night')).toBeVisible();
  await page.getByRole('button', { name: /Lists/ }).click();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('checkbox').first()).not.toBeChecked();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Pasta night')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Places & data' }).locator('input[value="Real home"]')).toBeVisible();
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

test('@claim:bought-state keeps bought status after reload without carrying it into next week', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Places & data' });
  await settings.getByLabel('New place name').fill('Home');
  await settings.getByRole('button', { name: 'Add place' }).click();
  await page.getByRole('dialog', { name: 'Places & data' }).getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Add meal on Monday' }).click();
  const firstMeal = page.getByRole('dialog', { name: 'Add to Monday' });
  await firstMeal.getByLabel('Meal name').fill('Week one dinner');
  await firstMeal.getByLabel('Ingredients, one per line').fill('Basil');
  await firstMeal.getByRole('button', { name: 'Save meal' }).click();
  await page.getByRole('button', { name: /Lists/ }).click();
  await page.getByRole('checkbox', { name: /Basil/ }).check();
  await page.reload();
  await page.getByRole('button', { name: /Lists/ }).click();
  await expect(page.getByRole('checkbox', { name: /Basil/ })).toBeChecked();

  await page.getByRole('button', { name: 'Next week' }).click();
  await page.locator('[data-view="plan"]').click();
  await page.getByRole('button', { name: 'Add meal on Monday' }).click();
  const nextMeal = page.getByRole('dialog', { name: 'Add to Monday' });
  await nextMeal.getByLabel('Meal name').fill('Week two dinner');
  await nextMeal.getByLabel('Ingredients, one per line').fill('Basil');
  await nextMeal.getByRole('button', { name: 'Save meal' }).click();
  await page.getByRole('button', { name: /Lists/ }).click();

  await expect(page.getByText('0 of 1 bought')).toBeVisible();
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
  const settings = page.getByRole('dialog', { name: 'Places & data' });
  await settings.getByLabel('New place name').fill('Home');
  await settings.getByRole('button', { name: 'Add place' }).click();
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
  await expect(page.getByRole('heading', { name: /Make separate shopping lists/ })).toBeVisible();
  await expect(page.getByText(/Offline · changes stay on this device/)).toBeAttached();
  await context.setOffline(false);
});

test('@claim:single-list-sharing copies and opens only the selected shopping list', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });
  await page.goto('/demo');
  await page.getByRole('button', { name: /Lists/ }).click();
  const home = page.locator('[data-boundary-sheet="demo-home"]');
  await home.getByRole('button', { name: 'Copy', exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Home');
  expect(copied).toContain('2 cans tomatoes');
  expect(copied).not.toContain('Bread');

  await home.getByRole('button', { name: 'Show QR' }).click();
  const qr = page.getByRole('dialog', { name: 'Scan to open this list' });
  const shareUrl = await qr.getByRole('button', { name: 'Copy link' }).getAttribute('data-url');
  const shared = await context.newPage();
  await shared.goto(shareUrl!);
  await expect(shared.getByRole('heading', { level: 1, name: /Home shopping list/ })).toBeVisible();
  await expect(shared.getByText('2 cans tomatoes', { exact: true })).toBeVisible();
  await expect(shared.getByText('Bread', { exact: true })).toHaveCount(0);
  await shared.close();
});

test('@claim:csv-export downloads the selected shopping list as CSV', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: /Lists/ }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-boundary-sheet="demo-home"]').getByRole('button', { name: 'CSV' }).click();
  const download = await downloadPromise;
  const contents = await streamText((await download.createReadStream())!);
  expect(download.suggestedFilename()).toMatch(/^Home-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(contents.split('\n')[0]).toBe('item,count,bought');
  expect(contents).toContain('"2 cans tomatoes",1,false');
  expect(contents).not.toContain('Bread');
});

test('@claim:json-backup exports and imports the complete planner', async ({ page }) => {
  await page.goto('/demo');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Lists/ }).click();
  await page.getByRole('button', { name: 'Export all data' }).click();
  const backup = await downloadPromise;
  const backupPath = await backup.path();
  expect(backupPath).toBeTruthy();
  const exported = JSON.parse(await streamText((await backup.createReadStream())!)) as { boundaries: unknown[]; meals: unknown[] };
  expect(exported.boundaries).toHaveLength(2);
  expect(exported.meals).toHaveLength(4);

  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.getByRole('button', { name: 'Open settings' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#import-file').setInputFiles(backupPath!);
  await expect(page.getByText('Pasta night')).toBeVisible();
  await expect(page.getByText('Cabin soup')).toBeVisible();
});

test('@claim:selected-list-print sends only the chosen list to print', async ({ page }) => {
  await page.addInitScript(() => {
    (window as typeof window & { printedLists?: string[] }).print = () => {
      (window as typeof window & { printedLists?: string[] }).printedLists = [...document.querySelectorAll<HTMLElement>('[data-boundary-sheet]')]
        .filter((sheet) => !sheet.classList.contains('print-hidden'))
        .map((sheet) => sheet.querySelector('h3')?.textContent ?? '');
    };
  });
  await page.goto('/demo');
  await page.getByRole('button', { name: /Lists/ }).click();
  await page.locator('[data-boundary-sheet="demo-home"]').getByRole('button', { name: 'Print' }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { printedLists?: string[] }).printedLists)).toEqual(['Home']);
});

test('@claim:free-two-places keeps both free lists and blocks a third place', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Open settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Places & data' });
  await expect(settings.locator('.boundary-settings li')).toHaveCount(2);
  await settings.getByLabel('New place name').fill('Parents');
  await settings.getByRole('button', { name: 'Add place' }).click();
  await expect(settings.locator('.boundary-settings li')).toHaveCount(2);
  await expect(page.getByText('The free planner includes two places. Field Kit adds more.')).toBeVisible();
});

test('@claim:field-kit-offer enables unlimited places and reusable templates with a valid license', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/meal-list-boundaries/verify?*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }),
  }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Field Kit costs $12 once' })).toBeVisible();
  await page.goto('/?license=fixture-license');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sb_license_verdict:meal-list-boundaries') ?? '{}').valid)).toBe(true);
  await page.getByRole('button', { name: 'Open settings' }).click();
  let settings = page.getByRole('dialog', { name: 'Places & data' });
  await expect(settings.getByText('Field Kit active')).toBeVisible();
  for (const name of ['Home', 'Cabin', 'Parents']) {
    await settings.getByLabel('New place name').fill(name);
    await settings.getByRole('button', { name: 'Add place' }).click();
    settings = page.getByRole('dialog', { name: 'Places & data' });
  }
  await expect(settings.locator('.boundary-settings li')).toHaveCount(3);
  await settings.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: 'Add meal on Monday' }).click();
  const meal = page.getByRole('dialog', { name: 'Add to Monday' });
  await meal.getByLabel('Meal name').fill('Pasta night');
  await meal.getByLabel('Ingredients, one per line').fill('Basil');
  await meal.getByRole('button', { name: 'Save meal' }).click();
  await page.getByRole('button', { name: 'Open settings' }).click();
  settings = page.getByRole('dialog', { name: 'Places & data' });
  await settings.getByLabel('Template name').fill('School week');
  await settings.getByRole('button', { name: 'Save this week' }).click();
  settings = page.getByRole('dialog', { name: 'Places & data' });
  await expect(settings.getByText(/School week/)).toBeVisible();
  await settings.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Next week' }).click();
  await page.getByRole('button', { name: 'Open settings' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('dialog', { name: 'Places & data' }).getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('Pasta night')).toBeVisible();
});

test('@claim:license-revocation keeps the free planner available after a license is revoked', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/meal-list-boundaries/verify?*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: false, reason: 'revoked', expires_at: null }),
  }));
  await page.goto('/?license=revoked-fixture');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sb_license_verdict:meal-list-boundaries') ?? '{}').reason)).toBe('revoked');
  await page.getByRole('button', { name: 'Open settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Places & data' });
  await expect(settings.getByText('Optional one-time purchase')).toBeVisible();
  await expect(settings.getByText('Field Kit active')).toHaveCount(0);
  await settings.getByLabel('New place name').fill('Home');
  await settings.getByRole('button', { name: 'Add place' }).click();
  await expect(page.getByRole('dialog', { name: 'Places & data' }).locator('input[value="Home"]')).toBeVisible();
});

test('demo has no axe violations in light or dark theme', async ({ page }) => {
  await page.goto('/demo');
  expect((await new AxeBuilder({ page: page as never }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Switch color theme' }).click();
  expect((await new AxeBuilder({ page: page as never }).analyze()).violations).toEqual([]);
});

test('invalid form and import keep the sample available for recovery', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Add meal on Sunday' }).click();
  const meal = page.getByRole('dialog', { name: 'Add to Sunday' });
  await meal.getByRole('button', { name: 'Save meal' }).click();
  await expect(meal).toBeVisible();
  expect(await meal.getByLabel('Meal name').evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  await meal.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Open settings' }).click();
  await page.locator('#import-file').setInputFiles('tests/fixtures/invalid-backup.json');
  await expect(page.getByText('That file uses an unsupported or incomplete export format.')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Places & data' })).toBeVisible();
  await expect(page.getByText('Pasta night')).toBeAttached();
});

test('keyboard focus enters the page and returns from the settings dialog', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to planner' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();

  const settingsButton = page.getByRole('button', { name: 'Open settings' });
  await settingsButton.focus();
  await page.keyboard.press('Enter');
  const settings = page.getByRole('dialog', { name: 'Places & data' });
  await expect(settings).toBeVisible();
  expect(await settings.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(settings).not.toBeVisible();
  await expect(settingsButton).toBeFocused();
});

test('reduced motion removes scrolling and visible transition movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demo');
  const motion = await page.evaluate(() => ({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    transitionDuration: getComputedStyle(document.querySelector('button')!).transitionDuration,
    animationDuration: getComputedStyle(document.querySelector('.view-panel')!).animationDuration,
  }));
  expect(motion.scrollBehavior).toBe('auto');
  expect(Number.parseFloat(motion.transitionDuration)).toBeLessThan(0.001);
  expect(Number.parseFloat(motion.animationDuration)).toBeLessThan(0.001);
});

test('routes expose their own titles, metadata, shell, and recovery page', async ({ page }) => {
  for (const route of [
    { path: '/', title: 'Meal List Boundaries — Separate shopping lists', canonical: '/' },
    { path: '/demo', title: 'Demo — Meal List Boundaries', canonical: '/demo' },
    { path: '/privacy/', title: 'Privacy — Meal List Boundaries', canonical: '/privacy/' },
    { path: '/terms/', title: 'Terms — Meal List Boundaries', canonical: '/terms/' },
    { path: '/404.html', title: 'Page not found — Meal List Boundaries', canonical: '/404.html' },
    { path: '/offline.html', title: 'Offline — Meal List Boundaries', canonical: '/offline.html' },
  ]) {
    await page.goto(route.path);
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://meal-list-boundaries.sociobot.in${route.canonical}`);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /meal-list-boundaries-social\.jpg$/);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.getByText(/Built by Param Factory/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
  await page.goto('/404.html');
  await expect(page.getByRole('heading', { level: 1, name: 'This page does not exist' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the meal planner' })).toHaveAttribute('href', '/');
});
