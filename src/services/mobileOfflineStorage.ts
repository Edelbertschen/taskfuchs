/**
 * Mobile Offline Storage Service
 * Provides IndexedDB-based caching for the Mobile Companion App
 * Read-only offline mode - data is cached when online, displayed when offline
 */

import type { Task } from '../types';

const DB_NAME = 'taskfuchs-mobile-cache';
const DB_VERSION = 1;
const TASKS_STORE = 'tasks';
const META_STORE = 'meta';

interface CacheMeta {
  key: string;
  timestamp: number;
  count: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initOfflineDB(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('IndexedDB not available for offline storage');
        resolve(false);
      };

      request.onsuccess = () => {
        db = request.result;
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;
        
        // Tasks store
        if (!database.objectStoreNames.contains(TASKS_STORE)) {
          database.createObjectStore(TASKS_STORE, { keyPath: 'id' });
        }
        
        // Meta store for cache timestamps
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE, { keyPath: 'key' });
        }
      };
    } catch (error) {
      console.warn('IndexedDB initialization failed:', error);
      resolve(false);
    }
  });
}

/**
 * Cache tasks to IndexedDB
 */
export async function cacheTasks(tasks: Task[]): Promise<void> {
  if (!db) {
    await initOfflineDB();
  }
  if (!db) return;

  return new Promise((resolve, reject) => {
    try {
      const transaction = db!.transaction([TASKS_STORE, META_STORE], 'readwrite');
      const tasksStore = transaction.objectStore(TASKS_STORE);
      const metaStore = transaction.objectStore(META_STORE);

      // Clear existing tasks
      tasksStore.clear();

      // Add new tasks
      tasks.forEach(task => {
        tasksStore.add(task);
      });

      // Update cache metadata
      const meta: CacheMeta = {
        key: 'tasks',
        timestamp: Date.now(),
        count: tasks.length
      };
      metaStore.put(meta);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get cached tasks from IndexedDB
 */
export async function getCachedTasks(): Promise<Task[]> {
  if (!db) {
    await initOfflineDB();
  }
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const transaction = db!.transaction([TASKS_STORE], 'readonly');
      const store = transaction.objectStore(TASKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        resolve([]);
      };
    } catch (error) {
      resolve([]);
    }
  });
}

/**
 * Get cache metadata (timestamp, count)
 */
export async function getCacheMeta(): Promise<CacheMeta | null> {
  if (!db) {
    await initOfflineDB();
  }
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const transaction = db!.transaction([META_STORE], 'readonly');
      const store = transaction.objectStore(META_STORE);
      const request = store.get('tasks');

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch (error) {
      resolve(null);
    }
  });
}

/**
 * Check if cache is available and not too old
 * Returns true if cache exists and is less than 24 hours old
 */
export async function isCacheValid(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<boolean> {
  const meta = await getCacheMeta();
  if (!meta) return false;
  
  const age = Date.now() - meta.timestamp;
  return age < maxAgeMs;
}

/**
 * Format cache age for display
 */
export function formatCacheAge(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
}

/**
 * Clear the offline cache
 */
export async function clearCache(): Promise<void> {
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const transaction = db!.transaction([TASKS_STORE, META_STORE], 'readwrite');
      transaction.objectStore(TASKS_STORE).clear();
      transaction.objectStore(META_STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Check online status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Subscribe to online/offline events
 */
export function subscribeToNetworkStatus(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Return unsubscribe function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

