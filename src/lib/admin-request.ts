type HeaderSource = { get(name: string): string | null }

export function getClientIp(headers: HeaderSource): string | null {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null
  }

  return headers.get('x-real-ip')
}

export function getUserAgent(headers: HeaderSource): string | null {
  return headers.get('user-agent')
}
