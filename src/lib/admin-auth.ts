import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

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

export interface AdminAuthConfig {
  username: string
  passwordHash: string
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

function getAdminPasswordHashFromEnv(): string {
  const base64Value = process.env.ADMIN_PASSWORD_SCRYPT_BASE64?.trim()
  if (base64Value) {
    return Buffer.from(base64Value, 'base64').toString('utf8').trim()
  }

  return getRequiredEnv('ADMIN_PASSWORD_SCRYPT')
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function getAdminAuthConfig(): AdminAuthConfig {
  return {
    username: getRequiredEnv('ADMIN_USERNAME'),
    passwordHash: getAdminPasswordHashFromEnv(),
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

export async function authenticateAdminCredentials(input: {
  username: string
  password: string
}): Promise<boolean> {
  const { username, password } = input
  const config = getAdminAuthConfig()

  const usernameMatches = safeCompare(username, config.username)
  const passwordMatches = verifyAdminPassword(password, config.passwordHash)

  return usernameMatches && passwordMatches
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

async function verifyAdminSessionCookieValue(
  token: string,
  secret: string,
  now: number
): Promise<AdminSessionPayload | null> {
  const session = await verifyAdminSessionToken(token, secret, now)
  if (session) return session

  try {
    const decodedToken = decodeURIComponent(token)
    if (decodedToken !== token) {
      return verifyAdminSessionToken(decodedToken, secret, now)
    }
  } catch {
    return null
  }

  return null
}

export async function getAdminSessionFromCookieHeader(
  cookieHeader: string | null | undefined,
  now = Date.now()
): Promise<AdminSessionPayload | null> {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return null

  const token = parseCookieHeader(cookieHeader)[ADMIN_SESSION_COOKIE]
  if (!token) return null

  return verifyAdminSessionCookieValue(token, secret, now)
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

  return verifyAdminSessionCookieValue(token, secret, now)
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
