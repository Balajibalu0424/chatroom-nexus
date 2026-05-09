/** @type {import('next').NextConfig} */
const defaultMeshCentralOrigin = 'https://mesh.chatroom.balajios.xyz'

const meshCentralOrigin = (() => {
  const candidates = [
    process.env.MESHCENTRAL_FRAME_ORIGIN,
    process.env.MESHCENTRAL_URL,
    defaultMeshCentralOrigin,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue

    try {
      return new URL(candidate).origin
    } catch {
      continue
    }
  }

  return null
})()

const contentSecurityPolicy = [
  `frame-src 'self'${meshCentralOrigin ? ` ${meshCentralOrigin}` : ''}`,
  `child-src 'self'${meshCentralOrigin ? ` ${meshCentralOrigin}` : ''}`,
  "frame-ancestors 'self'",
].join('; ')

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
