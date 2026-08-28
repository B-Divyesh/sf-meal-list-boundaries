import type { AppState, Boundary, BoundaryList, Meal, SharePayload } from './types';

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function emptyState(): AppState {
  return {
    version: 1,
    boundaries: [],
    meals: [],
    bought: {},
    templates: [],
    updatedAt: new Date().toISOString(),
  };
}

export function mondayOf(date: Date): string {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  return toDateKey(value);
}

export function addDays(dateKey: string, days: number): string {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function weekLabel(weekStart: string): string {
  const start = fromDateKey(weekStart);
  const end = fromDateKey(addDays(weekStart, 6));
  const month = new Intl.DateTimeFormat('en', { month: 'short' });
  if (start.getFullYear() !== end.getFullYear()) {
    return `${month.format(start)} ${start.getDate()}, ${start.getFullYear()} – ${month.format(end)} ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${month.format(start)} ${start.getDate()} – ${month.format(end)} ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${month.format(start)} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
}

export function normalizeIngredient(text: string): string {
  return text.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function boughtKey(boundaryId: string, text: string): string {
  return `${boundaryId}:${normalizeIngredient(text)}`;
}

export function buildLists(state: AppState, weekStart: string): BoundaryList[] {
  const meals = state.meals.filter((meal) => meal.weekStart === weekStart);
  return state.boundaries
    .map((boundary) => {
      const items = new Map<string, { text: string; count: number }>();
      meals
        .filter((meal) => meal.boundaryId === boundary.id)
        .flatMap((meal) => meal.ingredients)
        .forEach((ingredient) => {
          const normalized = normalizeIngredient(ingredient.text);
          if (!normalized) return;
          const current = items.get(normalized);
          items.set(normalized, { text: current?.text ?? ingredient.text.trim(), count: (current?.count ?? 0) + 1 });
        });
      return {
        boundary,
        items: [...items.entries()].map(([normalized, item]) => ({
          key: boughtKey(boundary.id, normalized),
          text: item.text,
          count: item.count,
          bought: Boolean(state.bought[boughtKey(boundary.id, normalized)]),
        })),
      };
    })
    .filter((list) => list.items.length > 0);
}

export function makeSharePayload(list: BoundaryList, weekStart: string): SharePayload {
  return {
    version: 1,
    listId: crypto.randomUUID(),
    boundary: { name: list.boundary.name, symbol: list.boundary.symbol, color: list.boundary.color },
    weekStart,
    generatedAt: new Date().toISOString(),
    items: list.items.map(({ text, count }) => ({ text, count })),
  };
}

export function encodePayload(payload: SharePayload): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodePayload(value: string): SharePayload {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  if (!isSharePayload(parsed)) throw new Error('This handoff link is incomplete or invalid.');
  return parsed;
}

function isSharePayload(value: unknown): value is SharePayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<SharePayload>;
  return payload.version === 1
    && typeof payload.listId === 'string'
    && typeof payload.weekStart === 'string'
    && Boolean(payload.boundary)
    && typeof payload.boundary?.name === 'string'
    && Array.isArray(payload.items)
    && payload.items.every((item) => typeof item?.text === 'string' && typeof item?.count === 'number');
}

export function validateImport(value: unknown): AppState {
  if (!value || typeof value !== 'object') throw new Error('That file does not contain a Meal List Boundaries export.');
  const candidate = value as Partial<AppState>;
  if (candidate.version !== 1 || !Array.isArray(candidate.boundaries) || !Array.isArray(candidate.meals)) {
    throw new Error('That file uses an unsupported or incomplete export format.');
  }
  if (!candidate.boundaries.every(isBoundary) || !candidate.meals.every(isMeal)) {
    throw new Error('Some boundaries or meals are malformed. Nothing was imported.');
  }
  return {
    version: 1,
    boundaries: candidate.boundaries,
    meals: candidate.meals,
    bought: candidate.bought && typeof candidate.bought === 'object' ? candidate.bought : {},
    templates: Array.isArray(candidate.templates) ? candidate.templates : [],
    updatedAt: new Date().toISOString(),
  };
}

function isBoundary(value: unknown): value is Boundary {
  if (!value || typeof value !== 'object') return false;
  const boundary = value as Partial<Boundary>;
  return ['id', 'name', 'symbol', 'color'].every((key) => typeof boundary[key as keyof Boundary] === 'string');
}

function isMeal(value: unknown): value is Meal {
  if (!value || typeof value !== 'object') return false;
  const meal = value as Partial<Meal>;
  return typeof meal.id === 'string' && typeof meal.weekStart === 'string' && typeof meal.day === 'number'
    && typeof meal.title === 'string' && typeof meal.boundaryId === 'string' && Array.isArray(meal.ingredients)
    && meal.ingredients.every((item) => typeof item?.id === 'string' && typeof item?.text === 'string');
}
