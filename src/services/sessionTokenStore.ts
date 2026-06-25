import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'veylo_session_token';

/** Persist opaque session tokens (e.g. Supabase JWT) — never use MMKV for secrets. */
export async function setSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function getSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function clearSessionToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}
