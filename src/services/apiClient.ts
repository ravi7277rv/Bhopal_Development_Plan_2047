import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { ENV } from '../config/env';

const ACCESS_TOKEN_KEY = 'bhopa:auth:access:token';
const REFRESH_TOKEN_KEY = 'bhopa:auth:refresh:token';
const USER_KEY = 'bhopa:auth:user';

/**
 * Centralized axios instance.
 * All API calls in the app should go through this client.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  // timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------
// REQUEST INTERCEPTOR — attach access token
// ---------------------------------------------------------------
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------
// RESPONSE INTERCEPTOR — handle 401 (optional token refresh)
// ---------------------------------------------------------------

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,

  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? '';

      // Do not redirect for login failures.
      if (
        !url.includes('/auth/login') &&
        !url.includes('/auth/force-logout')
      ) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        window.dispatchEvent(new Event('auth:logout'));
      }
    }

    return Promise.reject(error);
  }
);


// ---------------------------------------------------------------
// Helpers to read the axios error shape consistently
// ---------------------------------------------------------------
export interface ApiErrorBody {
  detail?: string;
  message?: string;
  [key: string]: unknown;
}

export const extractErrorDetail = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.detail || body?.message || error.message || 'Request failed';
  }
  return error instanceof Error ? error.message : 'Request failed';
};

export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY };