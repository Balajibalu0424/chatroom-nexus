import { buildMeshCentralSessionUrl, type MeshCentralMode } from '@/lib/meshcentral'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'
import type { AdminAuditLogInsert, AdminDevice } from '@/lib/types'

export const ADMIN_DEVICE_MODES = ['desktop', 'terminal', 'files'] as const

export type AdminLaunchMode = (typeof ADMIN_DEVICE_MODES)[number]

export interface AdminLaunchDescriptor {
  device: AdminDevice
  mode: AdminLaunchMode
  url: string
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function isAdminLaunchMode(value: string): value is AdminLaunchMode {
  return ADMIN_DEVICE_MODES.includes(value as AdminLaunchMode)
}

export function normalizeAdminLaunchMode(value: string | undefined): AdminLaunchMode {
  if (value && isAdminLaunchMode(value)) {
    return value
  }

  return 'desktop'
}

export async function listAdminDevices(): Promise<AdminDevice[]> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('admin_devices')
    .select('*')
    .eq('enabled', true)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as AdminDevice[]
}

export async function getAdminDeviceById(id: string): Promise<AdminDevice | null> {
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('admin_devices')
    .select('*')
    .eq('id', id)
    .eq('enabled', true)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as AdminDevice | null) ?? null
}

export async function recordAdminAuditLog(entry: AdminAuditLogInsert): Promise<void> {
  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('admin_audit_logs').insert(entry)

  if (error) {
    throw new Error(error.message)
  }
}

export async function buildAdminLaunchDescriptor(input: {
  device: AdminDevice
  mode: AdminLaunchMode
  adminUsername: string
  ipAddress: string | null
  userAgent: string | null
  logAudit?: (entry: AdminAuditLogInsert) => Promise<void>
  now?: number
}): Promise<AdminLaunchDescriptor> {
  const url = buildMeshCentralSessionUrl({
    baseUrl: getRequiredEnv('MESHCENTRAL_URL'),
    userId: getRequiredEnv('MESHCENTRAL_USERID'),
    keyHex: getRequiredEnv('MESHCENTRAL_LOGIN_TOKEN_KEY'),
    nodeId: input.device.mesh_node_id,
    mode: input.mode as MeshCentralMode,
    now: input.now,
  })

  await (input.logAudit ?? recordAdminAuditLog)({
    action: `launch_${input.mode}`,
    device_id: input.device.id,
    admin_username: input.adminUsername,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
    metadata: {
      mode: input.mode,
      mesh_node_id: input.device.mesh_node_id,
      platform: input.device.platform,
    },
  })

  return {
    device: input.device,
    mode: input.mode,
    url,
  }
}

export async function createAdminLaunchDescriptor(input: {
  deviceId: string
  mode: AdminLaunchMode
  adminUsername: string
  ipAddress: string | null
  userAgent: string | null
  now?: number
}): Promise<AdminLaunchDescriptor> {
  const device = await getAdminDeviceById(input.deviceId)
  if (!device) {
    throw new Error('Device not found')
  }

  return buildAdminLaunchDescriptor({
    device,
    mode: input.mode,
    adminUsername: input.adminUsername,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    now: input.now,
  })
}
