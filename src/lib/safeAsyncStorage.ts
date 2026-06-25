import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Minimal AsyncStorage shape used by Supabase Auth and Zustand persist.
 * Includes getAllKeys/multiRemove for cache clearing.
 */
export type SafeAsyncStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  getAllKeys: () => Promise<readonly string[]>;
  multiRemove: (keys: readonly string[]) => Promise<void>;
};

const memoryStore = new Map<string, string>();

const inMemoryAdapter: SafeAsyncStorage = {
  getItem: (key) => Promise.resolve(memoryStore.has(key) ? (memoryStore.get(key) as string) : null),
  setItem: (key, value) => {
    memoryStore.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    memoryStore.delete(key);
    return Promise.resolve();
  },
  getAllKeys: () => Promise.resolve([...memoryStore.keys()]),
  multiRemove: (keys: readonly string[]) => {
    keys.forEach((k) => memoryStore.delete(k));
    return Promise.resolve();
  },
};

function isNativeAsyncStorageReady(): boolean {
  try {
    return (
      AsyncStorage != null &&
      typeof AsyncStorage.getItem === 'function' &&
      typeof AsyncStorage.setItem === 'function' &&
      typeof AsyncStorage.removeItem === 'function' &&
      typeof AsyncStorage.getAllKeys === 'function' &&
      typeof AsyncStorage.multiRemove === 'function'
    );
  } catch {
    return false;
  }
}

/**
 * Never returns a bare undefined/null — Supabase and Zustand both call `.getItem` synchronously in some paths.
 * Falls back to an in-memory adapter when the native module is not usable (fixes "getItem of undefined" crashes).
 */
export function getSafeAsyncStorage(): SafeAsyncStorage {
  const nativeReady = isNativeAsyncStorageReady();
  if (nativeReady) {
    return AsyncStorage as unknown as SafeAsyncStorage;
  }
  if (__DEV__) {
    console.warn(
      '[Veylo] @react-native-async-storage/async-storage is not ready; using in-memory storage (sessions reset on restart).'
    );
  }
  return inMemoryAdapter;
}
