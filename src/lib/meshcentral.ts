import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export const MESH_HIDE_CHROME = 15

export type MeshCentralMode = 'desktop' | 'terminal' | 'files'

export interface MeshCentralLoginPayload {
  u: string
  a: 3
  time: number
  expire?: number
}

const MESH_MODE_TO_VIEW: Record<MeshCentralMode, number> = {
  desktop: 11,
  terminal: 12,
  files: 13,
}

function normalizeMeshCentralKey(keyHex: string): Buffer {
  if (!/^[0-9a-f]+$/i.test(keyHex) || keyHex.length < 64 || keyHex.length % 2 !== 0) {
    throw new Error('MESHCENTRAL_LOGIN_TOKEN_KEY must be an even-length hex string')
  }

  return Buffer.from(keyHex, 'hex')
}

function encodeMeshCookie(payload: MeshCentralLoginPayload, keyHex: string): string {
  const key = normalizeMeshCentralKey(keyHex)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key.subarray(0, 32), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])

  return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
    .toString('base64')
    .replace(/\+/g, '@')
    .replace(/\//g, '$')
}

export function decodeMeshCentralLoginToken(token: string, keyHex: string): MeshCentralLoginPayload {
  const key = normalizeMeshCentralKey(keyHex)
  const raw = Buffer.from(token.replace(/\@/g, '+').replace(/\$/g, '/'), 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key.subarray(0, 32), raw.subarray(0, 12))
  decipher.setAuthTag(raw.subarray(12, 28))
  const decoded = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
  return JSON.parse(decoded) as MeshCentralLoginPayload
}

export function createMeshCentralLoginToken(
  userId: string,
  keyHex: string,
  now = Date.now(),
  expireMinutes = 5
): string {
  const payload: MeshCentralLoginPayload = {
    u: userId,
    a: 3,
    time: Math.floor(now / 1000),
  }

  if (expireMinutes > 0) {
    payload.expire = expireMinutes
  }

  return encodeMeshCookie(payload, keyHex)
}

export function buildMeshCentralSessionUrl(input: {
  baseUrl: string
  userId: string
  keyHex: string
  nodeId: string
  mode: MeshCentralMode
  hide?: number
  now?: number
  expireMinutes?: number
}): string {
  const url = new URL(input.baseUrl)
  const loginToken = createMeshCentralLoginToken(
    input.userId,
    input.keyHex,
    input.now,
    input.expireMinutes
  )

  url.searchParams.set('login', loginToken)
  url.searchParams.set('hide', String(input.hide ?? MESH_HIDE_CHROME))
  url.searchParams.set('viewmode', String(MESH_MODE_TO_VIEW[input.mode]))
  url.searchParams.set('gotonode', input.nodeId)
  url.searchParams.set('node', input.nodeId)

  return url.toString()
}
