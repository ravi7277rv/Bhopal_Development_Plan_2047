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
  FORCE_LOGOUT_ENDPOINT: getEnv('VITE_FORCE_LOGOUT_ENDPOINT'),
   LOGOUT_ENDPOINT: getEnv('VITE_LOGOUT_ENDPOINT'),
   OBJECTION_HISTOY_ENDPOINT: getEnv('VITE_OBJECTION_HISTORY'),
   PDF_REPORT_ENDPOINT: getEnv('VITE_PDF_REPORT'),
} as const;