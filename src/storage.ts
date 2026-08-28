import { emptyState } from './domain';
import type { AppState } from './types';

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

export async function loadState(): Promise<AppState> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve((request.result as AppState | undefined) ?? emptyState());
    request.onerror = () => reject(request.error ?? new Error('Could not read your local plan.'));
    transaction.oncomplete = () => database.close();
  });
}

export async function saveState(state: AppState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(state, KEY);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('Could not save your changes.')); };
  });
}
