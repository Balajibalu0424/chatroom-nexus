// Sentry error tracking wrapper
// To enable: 
// 1. Create free account at https://sentry.io
// 2. Create a new project (Next.js)
// 3. Copy the DSN and add SENTRY_DSN to Vercel/Netlify env vars

let Sentry: any = null

export function initSentry() {
  if (typeof window === 'undefined') return
  
  // Dynamic import to avoid SSR issues
  import('@sentry/nextjs').then((mod) => {
    Sentry = mod
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: process.env.NODE_ENV === 'production',
      tracesSampleRate: 0.1,
    })
  }).catch(() => {
    // Sentry not configured - that's fine
    console.warn('Sentry not configured - set NEXT_PUBLIC_SENTRY_DSN to enable error tracking')
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
