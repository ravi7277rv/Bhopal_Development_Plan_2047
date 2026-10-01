import axios from 'axios';
import { ENV } from '../config/env';
import type { LoginCredentials, LoginResponse } from '../types/auth.type';
import {
  apiClient,
  extractErrorDetail,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  type ApiErrorBody,
} from './apiClient';

/** Sentinel string returned by the backend when a session conflict occurs. */
export const SESSION_CONFLICT_CODE = 'user_logged_in_another_device';

export const login = async (
  credentials: LoginCredentials
): Promise<LoginResponse> => {
  try {
    const { data } = await apiClient.post<LoginResponse>(
      ENV.LOGIN_ENDPOINT,
      credentials
    );

    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as ApiErrorBody | undefined;
      const detail = body?.detail ?? body?.message ?? '';
      // Pass the raw detail string up so AuthContext can store it verbatim
      throw new Error(detail || extractErrorDetail(error));
    }
    throw new Error(extractErrorDetail(error));
  }
};

export const forceLogout = async (
  username: string,
  password: string
): Promise<void> => {
  try {
    debugger
    await apiClient.post(ENV.FORCE_LOGOUT_ENDPOINT, { username, password });
  } catch (error) {
    throw new Error(extractErrorDetail(error));
  }
};

export const logout = async (): Promise<void> => {
  try {
    debugger
    await apiClient.post(ENV.LOGOUT_ENDPOINT);
  } catch (error) {
    console.warn('[auth.logout] API call failed:', extractErrorDetail(error));
  } finally {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

export const getToken = (): string | null =>
  localStorage.getItem(ACCESS_TOKEN_KEY);

export const getUser = (): LoginResponse['user'] | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};