import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ShieldAlert, MonitorCog, ScanEye } from 'lucide-react'

import { AdminLoginForm } from '@/components/admin/admin-login-form'
import { getAdminSessionFromCookieStore } from '@/lib/admin-auth'

export default async function AdminLoginPage() {
  const session = await getAdminSessionFromCookieStore(cookies())
  if (session) {
    redirect('/admin')
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.18),_transparent_45%),linear-gradient(135deg,_hsl(var(--background))_15%,_hsl(var(--muted))_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.9fr]">
        <section className="flex flex-col justify-between rounded-[2rem] border border-border/60 bg-background/70 p-8 shadow-2xl shadow-black/10 backdrop-blur md:p-10">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-primary">
              <ShieldAlert className="h-4 w-4" />
              Admin Control Plane
            </div>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight md:text-5xl">
                Launch your own devices without exposing the chatroom auth surface.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                This console is isolated from room access, uses a separate server-side session, and brokers short-lived
                MeshCentral sessions for desktop, terminal, and file access.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <MonitorCog className="mb-4 h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Separate auth</p>
              <p className="mt-2 text-sm text-muted-foreground">Scrypt password, TOTP, signed HttpOnly session cookie.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <ScanEye className="mb-4 h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Audited launches</p>
              <p className="mt-2 text-sm text-muted-foreground">Every remote session launch writes an admin audit row.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <ShieldAlert className="mb-4 h-5 w-5 text-primary" />
              <p className="text-sm font-medium">Short-lived tokens</p>
              <p className="mt-2 text-sm text-muted-foreground">The website never stores long-lived remote session URLs.</p>
            </div>
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[2rem] border border-border/60 bg-card/90 p-8 shadow-2xl shadow-black/10 md:p-10">
            <div className="mb-8 space-y-2">
              <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">Restricted Access</p>
              <h2 className="text-2xl font-semibold">Admin Sign-In</h2>
              <p className="text-sm text-muted-foreground">
                Use the dedicated admin account and your authenticator code. Chat PINs are not accepted here.
              </p>
            </div>
            <AdminLoginForm />
          </div>
        </section>
      </div>
    </main>
  )
}
