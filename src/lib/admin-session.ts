export const ADMIN_SESSION_COOKIE = 'admin_session'
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8

export interface AdminSessionPayload {
  username: string
  issuedAt: number
  expiresAt: number
}

const encoder = new TextEncoder()

function getCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available in this runtime')
  }

  return globalThis.crypto
}

function encodePayload(payload: AdminSessionPayload): string {
  return encodeURIComponent(JSON.stringify(payload))
}

function decodePayload(value: string): AdminSessionPayload | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as AdminSessionPayload
    if (
      typeof parsed.username !== 'string' ||
      typeof parsed.issuedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    return null
  }

  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16)
  }
  return bytes
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false

  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}

async function signValue(value: string, secret: string): Promise<string> {
  const crypto = getCrypto()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return bytesToHex(new Uint8Array(signature))
}

export async function createAdminSessionToken(
  username: string,
  secret: string,
  now = Date.now(),
  ttlSeconds = ADMIN_SESSION_TTL_SECONDS
): Promise<string> {
  const payload: AdminSessionPayload = {
    username,
    issuedAt: now,
    expiresAt: now + ttlSeconds * 1000,
  }

  const encodedPayload = encodePayload(payload)
  const signature = await signValue(encodedPayload, secret)
  return `${encodedPayload}.${signature}`
}

export async function verifyAdminSessionToken(
  token: string,
  secret: string,
  now = Date.now()
): Promise<AdminSessionPayload | null> {
  const separatorIndex = token.lastIndexOf('.')
  if (separatorIndex <= 0) return null

  const encodedPayload = token.slice(0, separatorIndex)
  const signature = token.slice(separatorIndex + 1)
  const signatureBytes = hexToBytes(signature)
  if (!signatureBytes) return null

  const expectedSignature = await signValue(encodedPayload, secret)
  if (!safeEqual(signature, expectedSignature)) {
    return null
  }

  const payload = decodePayload(encodedPayload)
  if (!payload) return null
  if (payload.issuedAt > now + 30_000) return null
  if (payload.expiresAt <= now) return null

  return payload
}
