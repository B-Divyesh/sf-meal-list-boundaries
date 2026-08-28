import { describe, expect, it } from 'vitest';
import { buildLists, decodePayload, emptyState, encodePayload, makeSharePayload, mondayOf, validateImport } from '../src/domain';
import type { AppState } from '../src/types';

function plannedState(): AppState {
  const state = emptyState();
  state.boundaries = [
    { id: 'home', name: 'Home', symbol: '⌂', color: '#2f684d' },
    { id: 'cabin', name: 'Cabin', symbol: '◇', color: '#7a4939' },
  ];
  state.meals = [
    { id: 'm1', weekStart: '2026-08-24', day: 0, title: 'Pasta', boundaryId: 'home', updatedAt: '', ingredients: [{ id: 'i1', text: '2 cans tomatoes' }, { id: 'i2', text: 'Basil' }] },
    { id: 'm2', weekStart: '2026-08-24', day: 1, title: 'Soup', boundaryId: 'home', updatedAt: '', ingredients: [{ id: 'i3', text: '  basil ' }] },
    { id: 'm3', weekStart: '2026-08-24', day: 2, title: 'Cabin pasta', boundaryId: 'cabin', updatedAt: '', ingredients: [{ id: 'i4', text: 'Basil' }] },
  ];
  return state;
}

describe('boundary list generation', () => {
  it('keeps the same ingredient in separate household lists', () => {
    const lists = buildLists(plannedState(), '2026-08-24');
    expect(lists).toHaveLength(2);
    expect(lists[0].items.find((item) => item.text === 'Basil')?.count).toBe(2);
    expect(lists[1].items.find((item) => item.text === 'Basil')?.count).toBe(1);
    expect(lists[0].items[0].key.startsWith('home:')).toBe(true);
    expect(lists[1].items[0].key.startsWith('cabin:')).toBe(true);
  });

  it('does not leak meals from another week', () => {
    expect(buildLists(plannedState(), '2026-08-31')).toEqual([]);
  });

  it('preserves only one boundary in a handoff payload', () => {
    const list = buildLists(plannedState(), '2026-08-24')[1];
    const decoded = decodePayload(encodePayload(makeSharePayload(list, '2026-08-24')));
    expect(decoded.boundary.name).toBe('Cabin');
    expect(decoded.items).toEqual([{ text: 'Basil', count: 1 }]);
  });
});

describe('dates and owned data', () => {
  it('finds Monday for a weekend date', () => {
    expect(mondayOf(new Date(2026, 7, 30))).toBe('2026-08-24');
  });

  it('rejects malformed imports without partial acceptance', () => {
    expect(() => validateImport({ version: 1, boundaries: 'Home', meals: [] })).toThrow(/unsupported or incomplete/);
  });
});
