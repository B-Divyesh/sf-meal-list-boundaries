import { emptyState, migrateState } from './domain';
import type { AppState, LegacyAppState } from './types';

const DB_NAME = 'meal-list-boundaries';
const STORE = 'documents';
const KEY = 'planner';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
}

export type LoadedState = { state: AppState; migrated: boolean };

export async function loadState(key = KEY): Promise<LoadedState> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(key);
    request.onsuccess = () => {
      const stored = request.result as AppState | LegacyAppState | undefined;
      resolve(stored ? { state: migrateState(stored), migrated: stored.version === 1 } : { state: emptyState(), migrated: false });
    };
    request.onerror = () => reject(request.error ?? new Error('Could not read your local plan.'));
    transaction.oncomplete = () => database.close();
  });
}

export async function saveState(state: AppState, key = KEY): Promise<void> {
  state.updatedAt = new Date().toISOString();
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(state, key);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Could not save your changes.')); };
  });
}

export async function clearState(key = KEY): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(key);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Could not clear local storage.')); };
  });
}
