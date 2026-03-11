import type { NextConfig } from 'next';

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const API_BASE = API_URL.replace(/\/api\/v1$/, '');

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_BASE}/api/v1/:path*`,
      },
      // PostHog reverse proxy — routes analytics through your domain so
      // ad-blockers don't interfere with event capture.
      {
        source: '/ingest/static/:path*',
        destination: `${POSTHOG_HOST}/static/:path*`,
      },
      {
        source: '/ingest/:path*',
        destination: `${POSTHOG_HOST}/:path*`,
      },
      {
        source: '/ingest/decide',
        destination: `${POSTHOG_HOST}/decide`,
      },
    ];
  },
  // Required for the PostHog proxy to work correctly
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
