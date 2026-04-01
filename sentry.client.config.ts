import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN || 'https://example@sentry.io/1234567',
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
  
  // Don't capture these
  denyUrls: [
    /localhost/,
    /127\.0\.0\.1/,
  ],
})

export default Sentry
