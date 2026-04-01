function readEnv(name: string, fallback = '') {
  return (import.meta.env[name] as string | undefined) ?? fallback
}

export const env = {
  appName: readEnv('VITE_APP_NAME', 'HD Parrainage'),
  appEnv: readEnv('VITE_APP_ENV', 'local'),
  appUrl: readEnv('VITE_APP_URL', 'http://localhost:5175'),
  apiBaseUrl: readEnv('VITE_API_BASE_URL', 'http://localhost:8081/api'),
  sentryDsn: readEnv('VITE_SENTRY_DSN'),
  gaMeasurementId: readEnv('VITE_GA_MEASUREMENT_ID'),
  analyticsEnabled: readEnv('VITE_ENABLE_ANALYTICS', 'false') === 'true',
}
