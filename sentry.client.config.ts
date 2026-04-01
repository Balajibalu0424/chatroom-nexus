import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://c2e011c347790fbd896f62d562b6c496@o4511145534750720.ingest.de.sentry.io/4511145554673744'

Sentry.init({
  dsn: SENTRY_DSN,
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Set environment
  environment: process.env.NODE_ENV,
  
  // Ignore certain errors
  ignoreErrors: [
    'Network Error',
    'Failed to fetch',
    'ChunkLoadError',
  ],
  
  // Don't capture these in development
  denyUrls: [
    /localhost/,
    /127\.0\.0\.1/,
  ],
})

export default Sentry
