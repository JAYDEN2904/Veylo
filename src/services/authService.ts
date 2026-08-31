import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { User, UserPreferences } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';

export class EmailVerificationRequiredError extends Error {
  readonly email: string;
  constructor(email: string, message: string = 'Check your email to confirm signup') {
    super(message);
    this.name = 'EmailVerificationRequiredError';
    this.email = email;
  }
}

WebBrowser.maybeCompleteAuthSession();

const defaultPreferences = (): UserPreferences => ({
  marketingEmails: false,
  pushNotifications: true,
  theme: 'system',
  publicProfile: false,
});

function mapProfileToUser(
  id: string,
  email: string,
  row: {
    name: string | null;
    avatar_url: string | null;
    body_type: string | null;
    location: unknown;
    preferences: unknown;
  }
): User {
  const prefsRaw = row.preferences as Partial<UserPreferences> | null | undefined;
  return {
    id,
    email,
    name: row.name ?? email.split('@')[0] ?? 'User',
    avatarUrl: row.avatar_url ?? undefined,
    bodyType: row.body_type as User['bodyType'],
    preferences: {
      ...defaultPreferences(),
      ...prefsRaw,
    },
    location:
      row.location && typeof row.location === 'object'
        ? (row.location as User['location'])
        : undefined,
  };
}

async function loadUserFromProfile(userId: string, email: string): Promise<User> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      id: userId,
      email,
      name: email.split('@')[0] ?? 'User',
      preferences: defaultPreferences(),
    };
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) {
    return {
      id: userId,
      email,
      name: email.split('@')[0] ?? 'User',
      preferences: defaultPreferences(),
    };
  }
  return mapProfileToUser(userId, email, data);
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User; accessToken: string }> {
  if (!isSupabaseConfigured()) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      user: {
        id: 'local-dev',
        email,
        name: 'Jane Doe',
        preferences: defaultPreferences(),
      },
      accessToken: 'mock-token',
    };
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const session = data.session;
  const authUser = data.user;
  if (!session || !authUser.email) {
    throw new Error('No session');
  }
  const user = await loadUserFromProfile(authUser.id, authUser.email);
  return { user, accessToken: session.access_token };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string
): Promise<{ user: User; accessToken: string }> {
  if (!isSupabaseConfigured()) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      user: {
        id: 'local-dev',
        email,
        name,
        preferences: defaultPreferences(),
      },
      accessToken: 'mock-token',
    };
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  const session = data.session;
  const authUser = data.user;
  if (!authUser?.email) {
    throw new Error('Check your email to confirm signup');
  }
  if (!session) {
    throw new EmailVerificationRequiredError(authUser.email);
  }
  const user = await loadUserFromProfile(authUser.id, authUser.email);
  return { user, accessToken: session.access_token };
}

/**
 * Confirm signup with the 6-digit email OTP (no browser / deep link).
 */
export async function verifySignupOtp(
  email: string,
  token: string
): Promise<{ user: User; accessToken: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedToken = token.replace(/\s/g, '');

  if (!normalizedEmail) {
    throw new Error('Email is required');
  }
  if (!/^\d{6}$/.test(normalizedToken)) {
    throw new Error('Enter the 6-digit code from your email');
  }

  if (!isSupabaseConfigured()) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      user: {
        id: 'local-dev',
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0] ?? 'User',
        preferences: defaultPreferences(),
      },
      accessToken: 'mock-token',
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: normalizedToken,
    type: 'signup',
  });

  if (error) {
    const message = error.message?.toLowerCase() ?? '';
    if (message.includes('expired') || message.includes('invalid')) {
      throw new Error('That code is invalid or expired. Request a new one and try again.');
    }
    throw error;
  }

  const session = data.session;
  const authUser = data.user;
  if (!session || !authUser?.email) {
    throw new Error('Verification failed. Please try again.');
  }

  const user = await loadUserFromProfile(authUser.id, authUser.email);
  return { user, accessToken: session.access_token };
}

/** Resend the signup confirmation OTP email. */
export async function resendSignupOtp(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  if (!isSupabaseConfigured()) {
    await new Promise((r) => setTimeout(r, 300));
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizedEmail,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

function buildRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'veylo',
    path: 'auth/callback',
  });
}

export async function signInWithGoogle(): Promise<{ user: User; accessToken: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Authentication is not configured.');
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const redirectTo = buildRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Google sign-in URL missing');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled.');
  }

  // Supabase returns tokens in either the query string or URL fragment.
  const qIndex = result.url.indexOf('?');
  const queryPart = qIndex >= 0 ? result.url.slice(qIndex + 1).split('#')[0] : '';
  const queryParams = Object.fromEntries(new URLSearchParams(queryPart));

  const hashIndex = result.url.indexOf('#');
  const fragment = hashIndex >= 0 ? result.url.slice(hashIndex + 1) : '';
  const fragmentParams = Object.fromEntries(new URLSearchParams(fragment));

  const accessToken =
    (fragmentParams['access_token'] as string | undefined) ??
    (queryParams['access_token'] as string | undefined);
  const refreshToken =
    (fragmentParams['refresh_token'] as string | undefined) ??
    (queryParams['refresh_token'] as string | undefined);

  if (!accessToken || !refreshToken) {
    throw new Error('Google sign-in did not return a session.');
  }

  const { data: sessionData, error: setErr } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (setErr) throw setErr;

  const authUser = sessionData.user;
  if (!authUser?.email) throw new Error('Google sign-in returned no user.');
  const user = await loadUserFromProfile(authUser.id, authUser.email);
  return { user, accessToken };
}

export async function signInWithApple(): Promise<{ user: User; accessToken: string }> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS.');
  }
  if (!isSupabaseConfigured()) {
    throw new Error('Authentication is not configured.');
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
  const session = data.session;
  const authUser = data.user;
  if (!session || !authUser?.email) {
    throw new Error('Apple sign-in returned no session.');
  }
  const user = await loadUserFromProfile(authUser.id, authUser.email);
  return { user, accessToken: session.access_token };
}
