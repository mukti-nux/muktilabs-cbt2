import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['cbt4u.muktilabs.my.id'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https: blob:;
              font-src 'self' data:;
              connect-src 'self' ${process.env.NEXT_PUBLIC_MOODLE_URL};
              frame-src 'none';
              object-src 'none';
              base-uri 'self';
              form-action 'self';
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ]
  }
}

export default nextConfig