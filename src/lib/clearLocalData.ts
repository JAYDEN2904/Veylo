import { getSafeAsyncStorage } from './safeAsyncStorage';

/** Clears persisted Zustand keys and other `veylo` AsyncStorage entries (local-only; server delete needs Edge Function). */
export async function clearLocalAppCaches(): Promise<void> {
  const storage = getSafeAsyncStorage();
  const keys = await storage.getAllKeys();
  const ours = keys.filter((k) => k.toLowerCase().includes('veylo') || k.startsWith('persist:'));
  if (ours.length > 0) {
    await storage.multiRemove(ours);
  }
}
