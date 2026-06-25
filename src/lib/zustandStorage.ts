import { createJSONStorage } from 'zustand/middleware';
import { getSafeAsyncStorage } from './safeAsyncStorage';

/**
 * JSON persistence for Zustand — same storage backend as Supabase auth when native AsyncStorage works.
 */
export const asyncJsonStorage = createJSONStorage(() => getSafeAsyncStorage());
