import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  type AdminSessionPayload,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '@/lib/admin-session'

const DEFAULT_SCRYPT_PARAMS = {
  cost: 16384,
  blockSize: 8,
  parallelization: 1,
  keyLength: 64,
}

const TOTP_STEP_SECONDS = 30

export interface AdminAuthConfig {
  username: string
  passwordHash: string
  totpSecret: string
  sessionSecret: string
}

export interface SessionCookieOptions {
  name: string
  value: string
  httpOnly: true
  sameSite: 'lax'
  secure: boolean
  path: string
  maxAge: number
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function normalizeBase32(input: string): string {
  return input.replace(/[\s=-]/g, '').toUpperCase()
}

function decodeBase32(input: string): Buffer {
  const normalized = normalizeBase32(input)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''

  for (const char of normalized) {
    const value = alphabet.indexOf(char)
    if (value === -1) {
      throw new Error('Invalid base32 secret')
    }
    bits += value.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }

  return Buffer.from(bytes)
}

function totpCounterBuffer(counter: number): Buffer {
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buffer.writeUInt32BE(counter >>> 0, 4)
  return buffer
}

function generateTotpForCounter(secret: string, counter: number): string {
  const key = decodeBase32(secret)
  const hmac = createHmac('sha1', key)
  hmac.update(totpCounterBuffer(counter))
  const digest = hmac.digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)

  return String(code % 1_000_000).padStart(6, '0')
}

export function getAdminAuthConfig(): AdminAuthConfig {
  return {
    username: getRequiredEnv('ADMIN_USERNAME'),
    passwordHash: getRequiredEnv('ADMIN_PASSWORD_SCRYPT'),
    totpSecret: getRequiredEnv('ADMIN_TOTP_SECRET'),
    sessionSecret: getRequiredEnv('ADMIN_SESSION_SECRET'),
  }
}

export function hashAdminPassword(
  password: string,
  options: Partial<typeof DEFAULT_SCRYPT_PARAMS> & { salt?: Buffer } = {}
): string {
  const cost = options.cost ?? DEFAULT_SCRYPT_PARAMS.cost
  const blockSize = options.blockSize ?? DEFAULT_SCRYPT_PARAMS.blockSize
  const parallelization = options.parallelization ?? DEFAULT_SCRYPT_PARAMS.parallelization
  const keyLength = options.keyLength ?? DEFAULT_SCRYPT_PARAMS.keyLength
  const salt = options.salt ?? randomBytes(16)

  const derivedKey = scryptSync(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
  })

  return [
    'scrypt',
    String(cost),
    String(blockSize),
    String(parallelization),
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$')
}

export function verifyAdminPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, costValue, blockSizeValue, parallelizationValue, saltValue, hashValue] = parts
  const cost = Number.parseInt(costValue, 10)
  const blockSize = Number.parseInt(blockSizeValue, 10)
  const parallelization = Number.parseInt(parallelizationValue, 10)
  const salt = Buffer.from(saltValue, 'base64url')
  const expected = Buffer.from(hashValue, 'base64url')

  if (!cost || !blockSize || !parallelization || expected.length === 0) {
    return false
  }

  const derivedKey = scryptSync(password, salt, expected.length, {
    N: cost,
    r: blockSize,
    p: parallelization,
  })

  return timingSafeEqual(derivedKey, expected)
}

export function generateTotpCode(secret: string, now = Date.now()): string {
  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS)
  return generateTotpForCounter(secret, counter)
}

export function verifyTotpCode(
  secret: string,
  code: string,
  now = Date.now(),
  window = 1
): boolean {
  if (!/^\d{6}$/.test(code)) return false

  const counter = Math.floor(now / 1000 / TOTP_STEP_SECONDS)
  for (let offset = -window; offset <= window; offset += 1) {
    if (safeCompare(generateTotpForCounter(secret, counter + offset), code)) {
      return true
    }
  }

  return false
}

export async function authenticateAdminCredentials(input: {
  username: string
  password: string
  totpCode: string
  now?: number
}): Promise<boolean> {
  const { username, password, totpCode, now = Date.now() } = input
  const config = getAdminAuthConfig()

  const usernameMatches = safeCompare(username, config.username)
  const passwordMatches = verifyAdminPassword(password, config.passwordHash)
  const totpMatches = verifyTotpCode(config.totpSecret, totpCode, now)

  return usernameMatches && passwordMatches && totpMatches
}

export function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) return {}

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, entry) => {
    const separatorIndex = entry.indexOf('=')
    if (separatorIndex <= 0) return cookies

    const name = entry.slice(0, separatorIndex).trim()
    const value = entry.slice(separatorIndex + 1).trim()
    cookies[name] = value
    return cookies
  }, {})
}

export async function getAdminSessionFromCookieHeader(
  cookieHeader: string | null | undefined,
  now = Date.now()
): Promise<AdminSessionPayload | null> {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return null

  const token = parseCookieHeader(cookieHeader)[ADMIN_SESSION_COOKIE]
  if (!token) return null

  return verifyAdminSessionToken(token, secret, now)
}

export async function getAdminSessionFromCookieStore(
  cookieStore: { get(name: string): { value: string } | undefined },
  now = Date.now()
): Promise<AdminSessionPayload | null> {
  const secret = process.env.ADMIN_SESSION_SECRET
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  if (!secret || !token) {
    return null
  }

  return verifyAdminSessionToken(token, secret, now)
}

export async function issueAdminSession(username: string, now = Date.now()): Promise<string> {
  const { sessionSecret } = getAdminAuthConfig()
  return createAdminSessionToken(username, sessionSecret, now, ADMIN_SESSION_TTL_SECONDS)
}

export function buildAdminSessionCookie(value: string): SessionCookieOptions {
  return {
    name: ADMIN_SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  }
}

export function buildClearedAdminSessionCookie(): SessionCookieOptions {
  return {
    ...buildAdminSessionCookie(''),
    maxAge: 0,
  }
}
