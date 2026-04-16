import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ArrowRight, Laptop2, LogOut, Monitor, TerminalSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getAdminSessionFromCookieStore } from '@/lib/admin-auth'
import { listAdminDevices } from '@/lib/admin-devices'
import type { AdminDevice } from '@/lib/types'

export const dynamic = 'force-dynamic'

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'windows':
      return Monitor
    case 'linux':
      return TerminalSquare
    default:
      return Laptop2
  }
}

export default async function AdminDashboardPage() {
  const session = await getAdminSessionFromCookieStore(cookies())
  if (!session) {
    redirect('/admin/login')
  }

  let devices: AdminDevice[] = []
  let setupError: string | null = null

  try {
    devices = await listAdminDevices()
  } catch (error) {
    setupError = error instanceof Error ? error.message : 'Unknown setup error'
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--muted))_100%)] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-lg shadow-black/5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Remote Operations</p>
            <h1 className="text-3xl font-semibold">Admin Device Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{session.username}</span>. Launch a remote
              session through MeshCentral for one of the registered devices.
            </p>
          </div>

          <form action="/api/admin/logout" method="post">
            <Button type="submit" variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </header>

        {setupError ? (
          <section className="rounded-[2rem] border border-dashed border-border bg-card/70 p-10 text-center">
            <p className="text-lg font-medium">Admin catalog is not ready yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              The admin pages are deployed, but the `admin_devices` table is not readable yet. Apply the new Supabase
              migration and seed the MeshCentral node IDs, then refresh this page.
            </p>
            <p className="mt-3 font-mono text-xs text-muted-foreground">{setupError}</p>
          </section>
        ) : devices.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-border bg-card/70 p-10 text-center">
            <p className="text-lg font-medium">No admin devices found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Seed or insert `admin_devices` rows first, then assign each row the MeshCentral node ID for the target
              machine.
            </p>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-2">
            {devices.map((device) => {
              const PlatformIcon = getPlatformIcon(device.platform)

              return (
                <article
                  key={device.id}
                  className="rounded-[2rem] border border-border/60 bg-card/90 p-6 shadow-lg shadow-black/5"
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <PlatformIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold">{device.label}</h2>
                        <p className="text-sm capitalize text-muted-foreground">{device.platform}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {device.enabled ? 'Online Ready' : 'Disabled'}
                    </span>
                  </div>

                  <dl className="mb-6 grid gap-3 rounded-2xl bg-muted/50 p-4 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">Mesh node ID</dt>
                      <dd className="max-w-[16rem] truncate font-mono text-xs text-foreground">{device.mesh_node_id}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">Sort order</dt>
                      <dd className="font-mono text-xs text-foreground">{device.sort_order}</dd>
                    </div>
                  </dl>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Button asChild>
                      <Link href={`/admin/devices/${device.id}?mode=desktop`} className="gap-2">
                        Desktop
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/admin/devices/${device.id}?mode=terminal`} className="gap-2">
                        Terminal
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/admin/devices/${device.id}?mode=files`} className="gap-2">
                        Files
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
