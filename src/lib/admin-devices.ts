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

const VALID_PLATFORMS = new Set<AdminDevice['platform']>(['windows', 'macos', 'linux', 'other'])

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function getEnvDeviceCatalogValue(): string | null {
  const base64Value = process.env.ADMIN_DEVICES_JSON_BASE64?.trim()
  if (base64Value) {
    try {
      return Buffer.from(base64Value, 'base64').toString('utf8').trim()
    } catch {
      throw new Error('ADMIN_DEVICES_JSON_BASE64 must be a base64 encoded JSON array')
    }
  }

  const value = process.env.ADMIN_DEVICES_JSON?.trim()
  return value ? value : null
}

function normalizeDeviceId(label: string, index: number): string {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || `device-${index + 1}`
}

function parseEnvDevice(rawDevice: unknown, index: number): AdminDevice {
  if (!rawDevice || typeof rawDevice !== 'object' || Array.isArray(rawDevice)) {
    throw new Error(`ADMIN_DEVICES_JSON entry ${index + 1} must be an object`)
  }

  const source = rawDevice as Record<string, unknown>
  const label = typeof source.label === 'string' ? source.label.trim() : ''
  const meshNodeId = typeof source.mesh_node_id === 'string' ? source.mesh_node_id.trim() : ''
  const platform = typeof source.platform === 'string' ? source.platform.trim().toLowerCase() : 'windows'

  if (!label) {
    throw new Error(`ADMIN_DEVICES_JSON entry ${index + 1} is missing label`)
  }

  if (!meshNodeId) {
    throw new Error(`ADMIN_DEVICES_JSON entry ${index + 1} is missing mesh_node_id`)
  }

  if (!VALID_PLATFORMS.has(platform as AdminDevice['platform'])) {
    throw new Error(`ADMIN_DEVICES_JSON entry ${index + 1} has an unsupported platform`)
  }

  const now = new Date(0).toISOString()

  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id.trim() : normalizeDeviceId(label, index),
    label,
    mesh_node_id: meshNodeId,
    platform: platform as AdminDevice['platform'],
    sort_order: typeof source.sort_order === 'number' ? source.sort_order : index + 1,
    enabled: typeof source.enabled === 'boolean' ? source.enabled : true,
    created_at: typeof source.created_at === 'string' ? source.created_at : now,
    updated_at: typeof source.updated_at === 'string' ? source.updated_at : now,
  }
}

export function getEnvAdminDevices(): AdminDevice[] | null {
  const value = getEnvDeviceCatalogValue()
  if (!value) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('ADMIN_DEVICES_JSON must be valid JSON')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('ADMIN_DEVICES_JSON must be a JSON array')
  }

  return parsed
    .map(parseEnvDevice)
    .filter((device) => device.enabled)
    .sort((left, right) => left.sort_order - right.sort_order || left.label.localeCompare(right.label))
}

export function isPlaceholderMeshNodeId(nodeId: string): boolean {
  return /^REPLACE_WITH_/i.test(nodeId.trim())
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
  const envDevices = getEnvAdminDevices()
  if (envDevices) {
    return envDevices
  }

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
  const envDevices = getEnvAdminDevices()
  if (envDevices) {
    return envDevices.find((device) => device.id === id) ?? null
  }

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
  if (isPlaceholderMeshNodeId(input.device.mesh_node_id)) {
    throw new Error(`MeshCentral node ID for ${input.device.label} is still a placeholder`)
  }

  const url = buildMeshCentralSessionUrl({
    baseUrl: getRequiredEnv('MESHCENTRAL_URL'),
    userId: getRequiredEnv('MESHCENTRAL_USERID'),
    keyHex: getRequiredEnv('MESHCENTRAL_LOGIN_TOKEN_KEY'),
    nodeId: input.device.mesh_node_id,
    mode: input.mode as MeshCentralMode,
    now: input.now,
  })

  const auditEntry = {
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
  }

  try {
    await (input.logAudit ?? recordAdminAuditLog)(auditEntry)
  } catch (error) {
    if (!getEnvDeviceCatalogValue() || input.logAudit) {
      throw error
    }

    console.error('Admin audit log fallback:', {
      action: auditEntry.action,
      device_id: auditEntry.device_id,
      error,
    })
  }

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
