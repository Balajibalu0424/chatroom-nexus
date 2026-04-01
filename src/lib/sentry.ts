// Sentry error tracking wrapper
// Configured with Sentry DSN from environment

let Sentry: any = null

export function initSentry() {
  if (typeof window === 'undefined') return
  
  // Dynamic import to avoid SSR issues
  import('@sentry/nextjs').then((mod) => {
    Sentry = mod
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://c2e011c347790fbd896f62d562b6c496@o4511145534750720.ingest.de.sentry.io/4511145554673744',
      enabled: process.env.NODE_ENV === 'production',
      tracesSampleRate: 0.1,
    })
  }).catch(() => {
    // Sentry not configured - that's fine
    console.warn('Sentry not configured')
  })
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (Sentry) {
    Sentry.captureException(error, { extra: context })
  }
  console.error(error)
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (Sentry) {
    Sentry.captureMessage(message, level)
  }
}
