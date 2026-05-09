/** @type {import('next').NextConfig} */
const defaultMeshCentralOrigin = 'https://mesh.chatroom.balajios.xyz'

const meshCentralOrigin = (() => {
  try {
    const meshCentralUrl =
      process.env.MESHCENTRAL_FRAME_ORIGIN ||
      process.env.MESHCENTRAL_URL ||
      defaultMeshCentralOrigin

    return new URL(meshCentralUrl).origin
  } catch {
    return null
  }
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
