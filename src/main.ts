import QRCode from 'qrcode';
import './styles.css';
import { addDays, buildLists, DAY_NAMES, decodePayload, encodePayload, fromDateKey, makeSharePayload, mondayOf, validateImport, weekLabel } from './domain';
import { BUY_URL, cachedLicenseValid, captureLicenseFromUrl, PRICE, saveLicense, verifyLicense } from './license';
import { clearState, loadState, saveState } from './storage';
import type { AppState, BoundaryList, Meal } from './types';

const root = document.querySelector<HTMLDivElement>('#app')!;

const COLORS = ['#2f684d', '#7a4939', '#365d73', '#795d22', '#6a4672', '#3f6661'];
const SYMBOLS = ['⌂', '◇', '○', '△', '□', '✦'];
const demoMode = location.pathname === '/demo';
const storageKey = demoMode ? 'demo:planner' : 'planner';

let state: AppState;
let currentWeek = mondayOf(new Date());
let view: 'plan' | 'lists' = 'plan';
let licensed = cachedLicenseValid();
let licenseNotice = '';
let toast: { message: string; action?: () => void; actionLabel?: string } | null = null;
let toastTimer = 0;
let storageError = '';

function sampleState(weekStart: string): AppState {
  return {
    version: 2,
    boundaries: [
      { id: 'demo-home', name: 'Home', symbol: '⌂', color: COLORS[0] },
      { id: 'demo-cabin', name: 'Cabin', symbol: '◇', color: COLORS[1] },
    ],
    meals: [
      { id: 'demo-pasta', weekStart, day: 0, title: 'Pasta night', boundaryId: 'demo-home', updatedAt: '', ingredients: [{ id: 'demo-basil', text: 'Basil' }, { id: 'demo-tomatoes', text: '2 cans tomatoes' }, { id: 'demo-pasta-noodles', text: 'Pasta' }] },
      { id: 'demo-tacos', weekStart, day: 2, title: 'Taco bowls', boundaryId: 'demo-home', updatedAt: '', ingredients: [{ id: 'demo-beans', text: 'Black beans' }, { id: 'demo-limes', text: 'Limes' }] },
      { id: 'demo-soup', weekStart, day: 1, title: 'Cabin soup', boundaryId: 'demo-cabin', updatedAt: '', ingredients: [{ id: 'demo-bread', text: 'Bread' }, { id: 'demo-cabin-basil', text: 'Basil' }] },
      { id: 'demo-breakfast', weekStart, day: 5, title: 'Trail breakfast', boundaryId: 'demo-cabin', updatedAt: '', ingredients: [{ id: 'demo-oats', text: 'Oats' }, { id: 'demo-apples', text: 'Apples' }] },
    ],
    bought: {},
    templates: [],
    updatedAt: new Date().toISOString(),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
}

function boundaryClass(color: string): string {
  const index = COLORS.findIndex((candidate) => candidate.toLowerCase() === color.toLowerCase());
  return `boundary-color-${index < 0 ? 0 : index}`;
}

function formatDay(week: string, index: number): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(fromDateKey(addDays(week, index)));
}

async function persist(message?: string): Promise<void> {
  try {
    await saveState(state, storageKey);
    storageError = '';
    if (message) showToast(message);
  } catch {
    storageError = 'Your latest change could not be saved on this device. Export a backup and try again.';
    render();
  }
}

function showToast(message: string, action?: () => void, actionLabel = 'Undo'): void {
  toast = { message, action, actionLabel };
  window.clearTimeout(toastTimer);
  renderToast();
  toastTimer = window.setTimeout(() => { toast = null; renderToast(); }, action ? 7000 : 4000);
}

function renderToast(): void {
  const region = document.querySelector<HTMLDivElement>('#toast-region');
  if (!region) return;
  region.innerHTML = toast ? `<div class="toast"><span>${escapeHtml(toast.message)}</span>${toast.action ? `<button type="button" data-action="toast-action">${escapeHtml(toast.actionLabel ?? 'Undo')}</button>` : ''}</div>` : '';
}

function icon(name: 'leaf' | 'gear' | 'plus' | 'download' | 'moon'): string {
  const paths = {
    leaf: '<path d="M5 19C7 9 12 4 23 3c-1 10-6 16-16 16M5 21c4-7 9-11 16-16"/>',
    gear: '<path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3 2-1-2-4-2 1-2-2 1-2-5-1-1 2-3 1-2-1-3 4 2 1v3l-2 1 2 4 2-1 2 2-1 2 5 1 1-2 3-1 2 1 3-4-2-1v-3Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/>',
    moon: '<path d="M20 15a8 8 0 0 1-11-11 9 9 0 1 0 11 11Z"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function shell(content: string, shared = false): string {
  return `
    <header class="site-header">
      <a class="brand" href="/" aria-label="Meal List Boundaries home">${icon('leaf')}<span>Meal List<br><b>Boundaries</b></span></a>
      <div class="header-actions">
        <span class="connection" id="connection-state" role="status"><i></i>${navigator.onLine ? 'Saved locally' : 'Offline · changes stay here'}</span>
        <button class="icon-button" type="button" data-action="theme" aria-label="Switch color theme">${icon('moon')}</button>
        ${shared ? '' : `<button class="icon-button" type="button" data-action="settings" aria-label="Open settings">${icon('gear')}</button>`}
      </div>
    </header>
    ${demoMode ? `<aside class="demo-banner" role="status"><span><b>Demo</b> — sample data, nothing is saved to your planner.</span><span><button type="button" data-action="reset-demo">Reset demo</button><button type="button" data-action="start-real">Start for real</button></span></aside>` : ''}
    ${content}
    <footer>
      <p>Private by default. Your plan lives on this device.</p>
      <nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="https://github.com/B-Divyesh/sf-meal-list-boundaries" rel="noreferrer">Source</a></nav>
      <p class="provenance">Field-guide illustration generated for this product with Azure OpenAI.</p>
    </footer>
    <div id="toast-region" class="toast-region" aria-live="polite" aria-atomic="true"></div>`;
}

function render(): void {
  const shareValue = new URLSearchParams(location.search).get('share');
  if (shareValue) {
    renderShared(shareValue);
    return;
  }
  const weekMeals = state.meals.filter((meal) => meal.weekStart === currentWeek);
  const mainContent = `
    <main id="main" tabindex="-1">
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-copy">
          <p class="eyebrow">Field note 01 · boundary-aware planning</p>
          <h1 id="page-title">One week. Every ingredient in the right hands.</h1>
          <p>Pin each meal to a home or pickup. Its ingredients stay on that list—from plan to handoff.</p>
          <div class="hero-actions">${demoMode ? '' : `<button class="primary" type="button" data-action="start-demo">Try it with sample data</button>`}</div>
          <div class="hero-legend" aria-label="How it works"><span><b>1</b> Name your places</span><span><b>2</b> Pin each meal</span><span><b>3</b> Hand off clean lists</span></div>
        </div>
        <picture class="hero-plate">
          <source type="image/avif" srcset="/assets/boundary-field-guide-640.avif 640w, /assets/boundary-field-guide-1024.avif 1024w" sizes="(max-width: 680px) 100vw, 54vw" />
          <source type="image/webp" srcset="/assets/boundary-field-guide-640.webp 640w, /assets/boundary-field-guide-1024.webp 1024w" sizes="(max-width: 680px) 100vw, 54vw" />
          <img src="/assets/boundary-field-guide-1024.jpg" width="1024" height="683" alt="Two paper grocery envelopes separated by a fern specimen, illustrating two distinct shopping boundaries" fetchpriority="high" decoding="async" />
        </picture>
      </section>
      ${storageError ? `<div class="alert error" role="alert"><b>Local save problem.</b> ${escapeHtml(storageError)}</div>` : ''}
      ${licenseNotice ? `<div class="alert notice" role="status">${escapeHtml(licenseNotice)} <a href="${BUY_URL}">View Field Kit</a></div>` : ''}
      <section class="workspace" aria-labelledby="week-heading">
        <div class="weekbar">
          <div><p class="specimen">Weekly field sheet</p><h2 id="week-heading">${weekLabel(currentWeek)}</h2></div>
          <div class="week-controls" aria-label="Choose week">
            <button type="button" data-action="prev-week" aria-label="Previous week">←</button>
            <button type="button" data-action="today">This week</button>
            <button type="button" data-action="next-week" aria-label="Next week">→</button>
          </div>
        </div>
        <nav class="view-tabs" aria-label="Planner views">
          <button type="button" data-view="plan" aria-pressed="${view === 'plan'}"><span>Plan</span><small>${weekMeals.length} meal${weekMeals.length === 1 ? '' : 's'}</small></button>
          <button type="button" data-view="lists" aria-pressed="${view === 'lists'}"><span>Lists</span><small>${buildLists(state, currentWeek).length} boundar${buildLists(state, currentWeek).length === 1 ? 'y' : 'ies'}</small></button>
        </nav>
        <div class="view-panel">${view === 'plan' ? renderPlan() : renderLists()}</div>
      </section>
    </main>
    ${renderMealDialog()}
    ${renderSettingsDialog()}
    ${renderQrDialog()}`;
  root.innerHTML = shell(mainContent);
  renderToast();
}

function renderPlan(): string {
  if (state.boundaries.length === 0) {
    return `<section class="empty-state"><span class="pressed-leaf" aria-hidden="true">⌁</span><p class="specimen">Begin the field sheet</p><h3>Name the places you shop for</h3><p>A boundary can be a home, cabin, parent’s pantry, or pickup stop. Start with two and meals will never cross between them.</p><button class="primary" type="button" data-action="settings">${icon('plus')} Add your first boundary</button></section>`;
  }
  return `<div class="day-grid">${DAY_NAMES.map((dayName, day) => {
    const meals = state.meals.filter((meal) => meal.weekStart === currentWeek && meal.day === day);
    return `<section class="day" aria-labelledby="day-${day}">
      <header><div><p>${formatDay(currentWeek, day)}</p><h3 id="day-${day}">${dayName}</h3></div><button class="add-meal" type="button" data-action="add-meal" data-day="${day}" aria-label="Add meal on ${dayName}">${icon('plus')}</button></header>
      ${meals.length ? `<ul class="meal-list">${meals.map(renderMeal).join('')}</ul>` : `<button class="empty-day" type="button" data-action="add-meal" data-day="${day}">Add a meal</button>`}
    </section>`;
  }).join('')}</div>`;
}

function renderMeal(meal: Meal): string {
  const boundary = state.boundaries.find((item) => item.id === meal.boundaryId);
  return `<li class="meal ${boundaryClass(boundary?.color ?? COLORS[0])}" data-meal-id="${meal.id}">
    <span class="boundary-tag">${escapeHtml(boundary?.symbol ?? '?')} ${escapeHtml(boundary?.name ?? 'Missing boundary')}</span>
    <b>${escapeHtml(meal.title)}</b>
    <span>${meal.ingredients.length} ingredient${meal.ingredients.length === 1 ? '' : 's'}</span>
    <div class="row-actions"><button type="button" data-action="edit-meal" data-id="${meal.id}">Edit</button><button class="danger-text" type="button" data-action="delete-meal" data-id="${meal.id}">Remove</button></div>
  </li>`;
}

function renderLists(): string {
  const lists = buildLists(state, currentWeek);
  if (!lists.length) {
    return `<section class="empty-state"><span class="pressed-leaf" aria-hidden="true">⌁</span><p class="specimen">No specimens gathered</p><h3>Your separated lists will appear here</h3><p>Add a meal and its ingredients to the week. The meal’s boundary determines exactly which list receives them.</p><button class="primary" type="button" data-action="switch-plan">Plan a meal</button></section>`;
  }
  return `<div class="lists-intro"><div><p class="specimen">Ready for handoff</p><h3>${lists.length} clean list${lists.length === 1 ? '' : 's'}, no crossed items</h3></div><button type="button" data-action="export-all">${icon('download')} Export all data</button></div>
    <div class="boundary-lists">${lists.map(renderBoundaryList).join('')}</div>`;
}

function renderBoundaryList(list: BoundaryList): string {
  const bought = list.items.filter((item) => item.bought).length;
  return `<article class="list-sheet ${boundaryClass(list.boundary.color)}" data-boundary-sheet="${list.boundary.id}">
    <header><div class="list-symbol">${escapeHtml(list.boundary.symbol)}</div><div><p class="specimen">Collection boundary</p><h3>${escapeHtml(list.boundary.name)}</h3><p>${bought} of ${list.items.length} gathered</p></div></header>
    <ul class="shopping-list">${list.items.map((item) => `<li class="${item.bought ? 'bought' : ''}"><label><input type="checkbox" data-action="toggle-bought" data-key="${escapeHtml(item.key)}" ${item.bought ? 'checked' : ''}/><span><b>${escapeHtml(item.text)}</b>${item.count > 1 ? `<small> × ${item.count}</small>` : ''}</span></label></li>`).join('')}</ul>
    <div class="list-actions"><button type="button" data-action="copy-list" data-id="${list.boundary.id}">Copy</button><button type="button" data-action="share-list" data-id="${list.boundary.id}">Share link</button><button type="button" data-action="qr-list" data-id="${list.boundary.id}">Show QR</button><button type="button" data-action="csv-list" data-id="${list.boundary.id}">CSV</button><button type="button" data-action="print-list" data-id="${list.boundary.id}">Print</button></div>
  </article>`;
}

function renderMealDialog(): string {
  return `<dialog id="meal-dialog" aria-labelledby="meal-dialog-title"><form method="dialog" id="meal-form">
    <div class="dialog-heading"><div><p class="specimen">Pin a meal</p><h2 id="meal-dialog-title">Add to the field sheet</h2></div><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close meal form">×</button></div>
    <input type="hidden" name="mealId"/><input type="hidden" name="day"/>
    <label>Meal name<input name="title" required maxlength="80" autocomplete="off" /></label>
    <label>Boundary<select name="boundaryId" required>${state.boundaries.map((boundary) => `<option value="${boundary.id}">${escapeHtml(boundary.symbol)} ${escapeHtml(boundary.name)}</option>`).join('')}</select><small>Every ingredient below inherits this boundary.</small></label>
    <label>Ingredients, one per line<textarea name="ingredients" rows="7" required placeholder="2 cans tomatoes&#10;1 bunch basil&#10;olive oil"></textarea><small>Include quantity in the line if it helps your buyer.</small></label>
    <p id="meal-form-error" class="form-error" role="alert"></p>
    <div class="dialog-actions"><button type="button" data-action="close-dialog">Cancel</button><button class="primary" type="submit">Save meal</button></div>
  </form></dialog>`;
}

function renderSettingsDialog(): string {
  return `<dialog id="settings-dialog" class="wide-dialog" aria-labelledby="settings-title"><div class="dialog-heading"><div><p class="specimen">Field cabinet</p><h2 id="settings-title">Boundaries & data</h2></div><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close settings">×</button></div>
    <section><h3>Your boundaries</h3><p class="muted">The free field sheet includes two. Field Kit adds as many as your week needs.</p>
      <ul class="boundary-settings">${state.boundaries.map((boundary) => `<li class="${boundaryClass(boundary.color)}"><span>${escapeHtml(boundary.symbol)}</span><form data-form="rename-boundary"><input type="hidden" name="id" value="${boundary.id}"/><label><span class="sr-only">Boundary name</span><input name="name" maxlength="40" required value="${escapeHtml(boundary.name)}"/></label><button type="submit">Save</button><button class="danger-text" type="button" data-action="delete-boundary" data-id="${boundary.id}">Remove</button></form></li>`).join('')}</ul>
      <form class="inline-form" data-form="add-boundary"><label><span>New boundary name</span><input name="name" maxlength="40" required placeholder="e.g. Lake house"/></label><button class="primary" type="submit">${icon('plus')} Add boundary</button></form>
    </section>
    <section class="settings-section"><h3>Your data</h3><p class="muted">Stored only in this browser. Export a JSON backup any time; importing replaces this device’s current planner after confirmation.</p><div class="button-row"><button type="button" data-action="export-all">${icon('download')} Export backup</button><label class="button-file">Import backup<input id="import-file" type="file" accept="application/json,.json"/></label></div></section>
    ${renderFieldKit()}
    <div class="dialog-actions"><button class="primary" type="button" data-action="close-dialog">Done</button></div>
  </dialog>`;
}

function renderFieldKit(): string {
  if (licensed) {
    return `<section class="settings-section field-kit"><p class="specimen">Field Kit unlocked</p><h3>Reusable week templates</h3><p class="muted">Save this week’s meal pattern, then apply it to any other week. Boundaries remain attached.</p>
      <form class="inline-form" data-form="save-template"><label><span>Template name</span><input name="name" maxlength="50" required placeholder="School week"/></label><button type="submit">Save this week</button></form>
      ${state.templates.length ? `<ul class="template-list">${state.templates.map((template) => `<li><span>${escapeHtml(template.name)} <small>${template.meals.length} meals</small></span><div><button type="button" data-action="apply-template" data-id="${template.id}">Apply</button><button class="danger-text" type="button" data-action="delete-template" data-id="${template.id}">Remove</button></div></li>`).join('')}</ul>` : '<p class="muted">No templates saved yet.</p>'}
    </section>`;
  }
  return `<section class="settings-section field-kit"><p class="specimen">Optional one-time unlock</p><h3>Field Kit · ${PRICE} one-time</h3><p>Keep the complete free planner, or unlock unlimited boundaries and reusable week templates. No subscription.</p><div class="button-row"><a class="primary button-link" href="${BUY_URL}">Buy Field Kit</a></div><form class="license-form" data-form="restore-license"><label><span>Have a license? Paste it here</span><input name="license" required autocomplete="off"/></label><button type="submit">Verify license</button></form><p class="muted">Checkout is hosted by Sociobot; Dodo is merchant of record. Refunds are handled there and revoke the license. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p></section>`;
}

function renderQrDialog(): string {
  return `<dialog id="qr-dialog" aria-labelledby="qr-title"><div class="dialog-heading"><div><p class="specimen">Account-free handoff</p><h2 id="qr-title">Scan this boundary</h2></div><button class="icon-button" type="button" data-action="close-dialog" aria-label="Close QR code">×</button></div><p id="qr-description">The link carries only this list. No account or server copy is created.</p><canvas id="qr-canvas" width="280" height="280" aria-label="QR code for this shopping list"></canvas><div class="dialog-actions"><button type="button" id="copy-qr-link" data-url="">Copy link</button><button class="primary" type="button" data-action="close-dialog">Done</button></div></dialog>`;
}

function renderShared(encoded: string): void {
  try {
    const payload = decodePayload(encoded);
    const checkedKey = `mlb_shared_bought:${payload.listId}`;
    const checked = new Set<string>(JSON.parse(localStorage.getItem(checkedKey) ?? '[]') as string[]);
    root.innerHTML = shell(`<main id="main" tabindex="-1" class="shared-main"><section class="shared-intro"><p class="eyebrow">Shared field sheet · ${escapeHtml(weekLabel(payload.weekStart))}</p><h1>${escapeHtml(payload.boundary.symbol)} ${escapeHtml(payload.boundary.name)} shopping list</h1><p>This handoff contains one boundary only. Tick items as you gather them; progress stays on this device.</p></section><article class="list-sheet shared-sheet ${boundaryClass(payload.boundary.color)}"><header><div class="list-symbol">${escapeHtml(payload.boundary.symbol)}</div><div><p class="specimen">Collection boundary</p><h2>${escapeHtml(payload.boundary.name)}</h2><p>${payload.items.length} item${payload.items.length === 1 ? '' : 's'}</p></div></header><ul class="shopping-list">${payload.items.map((item, index) => `<li class="${checked.has(String(index)) ? 'bought' : ''}"><label><input type="checkbox" data-shared-index="${index}" ${checked.has(String(index)) ? 'checked' : ''}/><span><b>${escapeHtml(item.text)}</b>${item.count > 1 ? `<small> × ${item.count}</small>` : ''}</span></label></li>`).join('')}</ul><div class="list-actions"><button type="button" data-action="print-shared">Print</button><a href="/">Open my planner</a></div></article></main>`, true);
    root.querySelectorAll<HTMLInputElement>('[data-shared-index]').forEach((input) => input.addEventListener('change', () => {
      input.checked ? checked.add(input.dataset.sharedIndex ?? '') : checked.delete(input.dataset.sharedIndex ?? '');
      localStorage.setItem(checkedKey, JSON.stringify([...checked]));
      input.closest('li')?.classList.toggle('bought', input.checked);
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'This handoff link is invalid.';
    root.innerHTML = shell(`<main id="main" tabindex="-1" class="shared-main"><section class="empty-state"><p class="specimen">Handoff unavailable</p><h1>This list could not be opened</h1><p>${escapeHtml(message)}</p><a class="button-link primary" href="/">Open my planner</a></section></main>`, true);
  }
}

function getList(boundaryId: string): BoundaryList | undefined {
  return buildLists(state, currentWeek).find((list) => list.boundary.id === boundaryId);
}

function listText(list: BoundaryList): string {
  return `${list.boundary.symbol} ${list.boundary.name} · ${weekLabel(currentWeek)}\n\n${list.items.map((item) => `${item.bought ? '✓' : '○'} ${item.text}${item.count > 1 ? ` × ${item.count}` : ''}`).join('\n')}\n\nMade with Meal List Boundaries`;
}

function makeShareUrl(list: BoundaryList): string {
  const payload = makeSharePayload(list, currentWeek);
  return `${location.origin}${location.pathname}?share=${encodePayload(payload)}`;
}

function download(name: string, contents: string, type: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([contents], { type }));
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

async function copy(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

function openMeal(day: number, mealId?: string): void {
  const dialog = document.querySelector<HTMLDialogElement>('#meal-dialog');
  const form = document.querySelector<HTMLFormElement>('#meal-form');
  if (!dialog || !form) return;
  const meal = mealId ? state.meals.find((item) => item.id === mealId) : undefined;
  (form.elements.namedItem('mealId') as HTMLInputElement).value = meal?.id ?? '';
  (form.elements.namedItem('day') as HTMLInputElement).value = String(meal?.day ?? day);
  (form.elements.namedItem('title') as HTMLInputElement).value = meal?.title ?? '';
  (form.elements.namedItem('boundaryId') as HTMLSelectElement).value = meal?.boundaryId ?? state.boundaries[0]?.id ?? '';
  (form.elements.namedItem('ingredients') as HTMLTextAreaElement).value = meal?.ingredients.map((item) => item.text).join('\n') ?? '';
  document.querySelector('#meal-dialog-title')!.textContent = meal ? 'Edit this meal' : `Add to ${DAY_NAMES[day]}`;
  dialog.showModal();
  (form.elements.namedItem('title') as HTMLInputElement).focus();
}

function openSettings(): void {
  document.querySelector<HTMLDialogElement>('#settings-dialog')?.showModal();
}

function reopenSettings(): void {
  window.setTimeout(openSettings);
}

async function showQr(boundaryId: string): Promise<void> {
  const list = getList(boundaryId);
  const dialog = document.querySelector<HTMLDialogElement>('#qr-dialog');
  const canvas = document.querySelector<HTMLCanvasElement>('#qr-canvas');
  const button = document.querySelector<HTMLButtonElement>('#copy-qr-link');
  if (!list || !dialog || !canvas || !button) return;
  try {
    const url = makeShareUrl(list);
    await QRCode.toCanvas(canvas, url, { width: 280, margin: 2, color: { dark: '#20342a', light: '#fffdf7' }, errorCorrectionLevel: 'M' });
    button.dataset.url = url;
    dialog.showModal();
  } catch {
    showToast('This list is too large for one QR code. Use Copy or Share link instead.');
  }
}

root.addEventListener('click', async (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-action], [data-view]');
  if (!button) return;
  const action = button.dataset.action;
  if (button.dataset.view === 'plan' || button.dataset.view === 'lists') { view = button.dataset.view; render(); return; }
  if (action === 'theme') {
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('mlb_theme', dark ? 'dark' : 'light');
  } else if (action === 'start-demo') location.assign('/demo');
  else if (action === 'reset-demo' && demoMode) { state = sampleState(currentWeek); await persist('Demo reset.'); render(); }
  else if (action === 'start-real' && demoMode) { await clearState(storageKey); location.assign('/'); }
  else if (action === 'settings') openSettings();
  else if (action === 'close-dialog') button.closest<HTMLDialogElement>('dialog')?.close();
  else if (action === 'add-meal') openMeal(Number(button.dataset.day ?? 0));
  else if (action === 'edit-meal') openMeal(0, button.dataset.id);
  else if (action === 'delete-meal') {
    const meal = state.meals.find((item) => item.id === button.dataset.id);
    if (meal && confirm(`Remove “${meal.title}” and its ingredients from this week?`)) {
      state.meals = state.meals.filter((item) => item.id !== meal.id); await persist('Meal removed.'); render();
    }
  } else if (action === 'prev-week' || action === 'next-week') { currentWeek = addDays(currentWeek, action === 'prev-week' ? -7 : 7); render(); }
  else if (action === 'today') { currentWeek = mondayOf(new Date()); render(); }
  else if (action === 'switch-plan') { view = 'plan'; render(); }
  else if (action === 'toggle-bought') {
    const key = button.dataset.key ?? '';
    const previous = Boolean(state.bought[key]);
    state.bought[key] = !previous;
    await persist(); render(); showToast(state.bought[key] ? 'Marked as gathered.' : 'Returned to the list.', async () => { state.bought[key] = previous; await persist(); render(); });
  } else if (action === 'toast-action' && toast?.action) { const run = toast.action; toast = null; await run(); }
  else if (action === 'copy-list') {
    const list = getList(button.dataset.id ?? ''); if (list) { try { await copy(listText(list)); showToast('List copied.'); } catch { showToast('Copy was blocked. Select the list and copy it manually.'); } }
  } else if (action === 'share-list') {
    const list = getList(button.dataset.id ?? ''); if (!list) return; const url = makeShareUrl(list);
    try { if (navigator.share) await navigator.share({ title: `${list.boundary.name} shopping list`, text: listText(list), url }); else { await copy(url); showToast('Private share link copied.'); } } catch (error) { if ((error as DOMException).name !== 'AbortError') showToast('Sharing was blocked. Try Copy instead.'); }
  } else if (action === 'qr-list') await showQr(button.dataset.id ?? '');
  else if (action === 'csv-list') {
    const list = getList(button.dataset.id ?? ''); if (list) download(`${list.boundary.name}-${currentWeek}.csv`, `item,count,bought\n${list.items.map((item) => `"${item.text.replaceAll('"', '""')}",${item.count},${item.bought}`).join('\n')}`, 'text/csv');
  } else if (action === 'print-list') {
    const target = button.dataset.id ?? '';
    document.querySelectorAll<HTMLElement>('[data-boundary-sheet]').forEach((sheet) => sheet.classList.toggle('print-hidden', sheet.dataset.boundarySheet !== target));
    window.print();
    document.querySelectorAll<HTMLElement>('[data-boundary-sheet]').forEach((sheet) => sheet.classList.remove('print-hidden'));
  }
  else if (action === 'print-shared') window.print();
  else if (action === 'export-all') download(`meal-list-boundaries-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), 'application/json');
  else if (action === 'delete-boundary') {
    const boundary = state.boundaries.find((item) => item.id === button.dataset.id); const meals = state.meals.filter((meal) => meal.boundaryId === boundary?.id).length;
    if (boundary && confirm(`Remove “${boundary.name}”${meals ? ` and its ${meals} meal${meals === 1 ? '' : 's'}` : ''}? This cannot be undone.`)) { state.boundaries = state.boundaries.filter((item) => item.id !== boundary.id); state.meals = state.meals.filter((item) => item.boundaryId !== boundary.id); await persist('Boundary removed.'); render(); reopenSettings(); }
  } else if (action === 'apply-template') {
    const template = state.templates.find((item) => item.id === button.dataset.id); if (template && confirm(`Add ${template.meals.length} meals from “${template.name}” to ${weekLabel(currentWeek)}?`)) { state.meals.push(...template.meals.filter((meal) => state.boundaries.some((boundary) => boundary.id === meal.boundaryId)).map((meal) => ({ ...meal, id: crypto.randomUUID(), weekStart: currentWeek, updatedAt: new Date().toISOString(), ingredients: meal.ingredients.map((item) => ({ ...item, id: crypto.randomUUID() })) }))); await persist('Template applied.'); render(); }
  } else if (action === 'delete-template') { state.templates = state.templates.filter((item) => item.id !== button.dataset.id); await persist('Template removed.'); render(); reopenSettings(); }
  else if (button.id === 'copy-qr-link') { try { await copy(button.dataset.url ?? ''); showToast('Private share link copied.'); } catch { showToast('Copy was blocked by this browser.'); } }
});

root.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const data = new FormData(form);
  if (form.id === 'meal-form') {
    const title = String(data.get('title') ?? '').trim(); const ingredientLines = String(data.get('ingredients') ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
    if (!title || !ingredientLines.length) { document.querySelector('#meal-form-error')!.textContent = 'Add a meal name and at least one ingredient.'; return; }
    const id = String(data.get('mealId') ?? ''); const existing = state.meals.find((meal) => meal.id === id);
    const meal: Meal = { id: existing?.id ?? crypto.randomUUID(), weekStart: currentWeek, day: Number(data.get('day')), title, boundaryId: String(data.get('boundaryId')), ingredients: ingredientLines.map((text, index) => ({ id: existing?.ingredients[index]?.id ?? crypto.randomUUID(), text })), updatedAt: new Date().toISOString() };
    existing ? state.meals.splice(state.meals.indexOf(existing), 1, meal) : state.meals.push(meal);
    form.closest<HTMLDialogElement>('dialog')?.close(); render(); await persist(existing ? 'Meal updated.' : 'Meal pinned to its boundary.');
  } else if (form.dataset.form === 'add-boundary') {
    if (!licensed && state.boundaries.length >= 2) { showToast('The free field sheet includes two boundaries. Field Kit unlocks more.'); return; }
    const name = String(data.get('name') ?? '').trim(); if (!name) return; const index = state.boundaries.length;
    state.boundaries.push({ id: crypto.randomUUID(), name, symbol: SYMBOLS[index % SYMBOLS.length], color: COLORS[index % COLORS.length] }); render(); reopenSettings(); await persist('Boundary added.');
  } else if (form.dataset.form === 'rename-boundary') {
    const boundary = state.boundaries.find((item) => item.id === data.get('id')); const name = String(data.get('name') ?? '').trim(); if (boundary && name) boundary.name = name; await persist('Boundary name saved.'); render(); reopenSettings();
  } else if (form.dataset.form === 'restore-license') {
    const token = String(data.get('license') ?? '').trim(); saveLicense(token); showToast('Checking your license…'); const result = await verifyLicense(true); licensed = result.valid; licenseNotice = result.valid ? '' : result.offline ? 'Could not reach license verification. Your free planner remains available.' : 'That license is not active for this product.'; render(); if (licensed) { showToast('Field Kit unlocked on this device.'); reopenSettings(); }
  } else if (form.dataset.form === 'save-template') {
    const meals = state.meals.filter((meal) => meal.weekStart === currentWeek); if (!meals.length) { showToast('Add at least one meal to this week first.'); return; }
    state.templates.push({ id: crypto.randomUUID(), name: String(data.get('name') ?? '').trim(), meals: meals.map(({ id: _id, weekStart: _weekStart, updatedAt: _updatedAt, ...meal }) => meal) }); await persist('Week template saved.'); render(); reopenSettings();
  }
});

root.addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement;
  if (input.id !== 'import-file' || !input.files?.[0]) return;
  try {
    const imported = validateImport(JSON.parse(await input.files[0].text()));
    if (!confirm(`Replace this device’s planner with ${imported.boundaries.length} boundaries and ${imported.meals.length} meals?`)) return;
    state = imported; await persist('Backup imported.'); render();
  } catch (error) { showToast(error instanceof Error ? error.message : 'That backup could not be imported.'); }
});

function applyTheme(): void {
  const saved = localStorage.getItem('mlb_theme');
  document.documentElement.dataset.theme = saved ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          showToast('An updated field sheet is ready.', () => { worker.postMessage({ type: 'SKIP_WAITING' }); location.reload(); }, 'Reload');
        }
      });
    });
  }).catch(() => { /* The app still works online without installation. */ });
}

async function start(): Promise<void> {
  applyTheme();
  if (demoMode) document.title = 'Demo — Meal List Boundaries';
  captureLicenseFromUrl();
  let migrated = false;
  try { const loaded = await loadState(storageKey); state = loaded.state; migrated = loaded.migrated; } catch { state = { version: 2, boundaries: [], meals: [], bought: {}, templates: [], updatedAt: new Date().toISOString() }; storageError = 'This browser blocked local storage. You can explore, but changes may not survive a refresh.'; }
  if (demoMode && state.boundaries.length === 0 && state.meals.length === 0) state = sampleState(currentWeek);
  if (migrated) await persist();
  render();
  if (migrated) showToast('Updated local checkmarks so each week stays separate.');
  window.addEventListener('online', () => render());
  window.addEventListener('offline', () => render());
  const result = await verifyLicense();
  licensed = result.valid;
  if (!result.valid && !result.offline && localStorage.getItem('sb_license:meal-list-boundaries')) licenseNotice = 'License no longer active. Paid features are locked; your plans remain safe.';
  render();
  registerServiceWorker();
}

void start();
