/**
 * Centralized env access — throws early if required vars are missing.
 * Never read `import.meta.env` directly in components.
 */
const getEnv = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const ENV = {
  API_BASE_URL: getEnv('VITE_API_BASE_URL'),
  LOGIN_ENDPOINT: getEnv('VITE_LOGIN_ENDPOINT'),
} as const;