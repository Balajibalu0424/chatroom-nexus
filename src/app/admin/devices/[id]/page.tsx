import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, FolderOpen, Monitor, TerminalSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getAdminSessionFromCookieStore } from '@/lib/admin-auth'
import { createAdminLaunchDescriptor, normalizeAdminLaunchMode } from '@/lib/admin-devices'
import { getClientIp, getUserAgent } from '@/lib/admin-request'

export const dynamic = 'force-dynamic'

const MODE_LABELS = {
  desktop: 'Remote Desktop',
  terminal: 'Terminal',
  files: 'Files',
} as const

const MODE_ICONS = {
  desktop: Monitor,
  terminal: TerminalSquare,
  files: FolderOpen,
} as const

export default async function AdminDevicePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { mode?: string }
}) {
  const session = await getAdminSessionFromCookieStore(cookies())
  if (!session) {
    redirect('/admin/login')
  }

  const mode = normalizeAdminLaunchMode(searchParams?.mode)
  const requestHeaders = headers()

  let descriptor
  let setupError: string | null = null
  try {
    descriptor = await createAdminLaunchDescriptor({
      deviceId: params.id,
      mode,
      adminUsername: session.username,
      ipAddress: getClientIp(requestHeaders),
      userAgent: getUserAgent(requestHeaders),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Device not found') {
      notFound()
    }

    setupError = error instanceof Error ? error.message : 'Unknown setup error'
  }

  const ModeIcon = MODE_ICONS[mode]

  if (!descriptor) {
    return (
      <main className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="rounded-[2rem] border border-border/60 bg-card/90 p-6 shadow-lg shadow-black/5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Remote Operations</p>
            <h1 className="mt-2 text-2xl font-semibold">Remote session is not ready</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The page is deployed, but MeshCentral configuration or the admin device catalog is incomplete.
            </p>
            <p className="mt-4 rounded-2xl bg-muted p-4 font-mono text-xs text-muted-foreground">{setupError}</p>
            <div className="mt-5">
              <Button asChild variant="outline">
                <Link href="/admin" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </Link>
              </Button>
            </div>
          </header>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/90 p-5 shadow-lg shadow-black/5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ModeIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{descriptor.device.label}</p>
                <h1 className="text-2xl font-semibold">{MODE_LABELS[mode]}</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This page minted a short-lived MeshCentral login token server-side and recorded the launch in
              `admin_audit_logs`.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant={mode === 'desktop' ? 'default' : 'outline'}>
              <Link href={`/admin/devices/${descriptor.device.id}?mode=desktop`}>Desktop</Link>
            </Button>
            <Button asChild variant={mode === 'terminal' ? 'default' : 'outline'}>
              <Link href={`/admin/devices/${descriptor.device.id}?mode=terminal`}>Terminal</Link>
            </Button>
            <Button asChild variant={mode === 'files' ? 'default' : 'outline'}>
              <Link href={`/admin/devices/${descriptor.device.id}?mode=files`}>Files</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-2xl shadow-black/10">
          <iframe
            key={`${descriptor.device.id}:${mode}`}
            src={descriptor.url}
            title={`${descriptor.device.label} ${MODE_LABELS[mode]}`}
            className="h-[calc(100vh-12rem)] w-full bg-black"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        </section>
      </div>
    </main>
  )
}
