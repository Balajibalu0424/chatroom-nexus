/** @type {import('next').NextConfig} */
const meshCentralOrigin = (() => {
  try {
    return process.env.MESHCENTRAL_URL
      ? new URL(process.env.MESHCENTRAL_URL).origin
      : null
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
