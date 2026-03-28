import type { NextConfig } from 'next'

const cspConnectSources = [
  "'self'",
  process.env.NEXT_PUBLIC_MOODLE_URL?.trim(),
  ...(process.env.NEXT_PUBLIC_CSP_CONNECT?.split(',').map(s => s.trim()).filter(Boolean) ?? []),
  'https://lms.muktilabs.my.id',
  'ws://192.168.100.102:7880',
  'wss://192.168.100.102:7880',  // tambahan untuk HTTPS
  'http://192.168.100.102:7880',
  'https://192.168.100.102:7880', // tambahan kalau LiveKit pakai TLS
].filter(Boolean)

const cspDirectives = {
  default: "default-src 'self'",
  script: "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  style: "style-src 'self' 'unsafe-inline'",
  img: "img-src 'self' data: https: blob:",
  font: "font-src 'self' data:",
  connect: `connect-src ${cspConnectSources.join(' ')}`,
  media: "media-src 'self' blob:",        // ← tambah untuk video stream
  frame: "frame-src 'self'",              // ← ubah dari 'none' kalau butuh iframe
  object: "object-src 'none'",
  base: "base-uri 'self'",
  form: "form-action 'self'",
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['cbt4u.muktilabs.my.id', '192.168.100.102'], // ← tambah IP LiveKit

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: Object.values(cspDirectives)
              .filter(Boolean)
              .join('; ')
              .trim(),
          },
        ],
      },
    ]
  },
}

export default nextConfig