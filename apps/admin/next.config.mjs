import path from 'node:path';

const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  poweredByHeader: false,
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(process.cwd(), 'src'),
    };
    return config;
  },
  async rewrites() {
    const configuredOrigin = process.env.ABSHER_API_ORIGIN;
    if (!configuredOrigin) {
      throw new Error('ABSHER_API_ORIGIN must be configured for this environment; refusing to default to Staging.');
    }
    const apiOrigin = configuredOrigin.replace(/\/+$/, '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          ...(process.env.NODE_ENV === 'production'
            ? [{
                key: 'Strict-Transport-Security',
                value: 'max-age=31536000; includeSubDomains',
              }]
            : []),
        ],
      },
    ];
  },
};
export default nextConfig;
