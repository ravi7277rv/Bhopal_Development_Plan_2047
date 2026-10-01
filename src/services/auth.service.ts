import { ENV } from '../config/env';
import type { LoginCredentials, LoginResponse } from '../types/auth.type';

const TOKEN_KEY = 'bhopa:auth:token';
const USER_KEY = 'bhopa:auth:user';

/**
 * Login against the backend API.
 * Sends credentials, persists token + user on success.
 */
export const login = async (
  credentials: LoginCredentials
): Promise<LoginResponse> => {
  const url = `${ENV.API_BASE_URL}${ENV.LOGIN_ENDPOINT}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody?.message || `Login failed (${response.status})`
    );
  }

  const data: LoginResponse = await response.json();

  // Persist
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));

  return data;
};

export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const getUser = (): LoginResponse['user'] | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Optional: attach auth token to outgoing requests.
 * Use this if you have other API calls in the app.
 */
export const authHeaders = (): HeadersInit => {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
};