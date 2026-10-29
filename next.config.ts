import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const baseConfig: NextConfig = {
  // Turbopack root (merged from next.config.js)
  turbopack: { root: import.meta.dirname },
  transpilePackages: ['geist'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com', port: '' },
      { protocol: 'https', hostname: 'image.clerk.com', port: '' },
      { protocol: 'https', hostname: 'clerk.com', port: '' }
      // api.slingacademy.com removed (template artifact)
    ]
  }
};

// Sentry disabled when NEXT_PUBLIC_SENTRY_DISABLED=true
// Initial NEXT bootstrap: always disabled
const sentryEnabled = process.env.NEXT_PUBLIC_SENTRY_DISABLED !== 'true';

const nextConfig: NextConfig = sentryEnabled
  ? withSentryConfig(baseConfig, {
      org: process.env.NEXT_PUBLIC_SENTRY_ORG,
      project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      reactComponentAnnotation: { enabled: true },
      tunnelRoute: '/monitoring',
      disableLogger: true,
      telemetry: false
    })
  : baseConfig;

export default nextConfig;
