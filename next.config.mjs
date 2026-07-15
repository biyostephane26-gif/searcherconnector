/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    outputFileTracingIncludes: {
      '/api/**': ['./node_modules/**'],
    },
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Skip ALL static generation to prevent build freeze
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Force all routes to be dynamic
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  images: {

    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(self), geolocation=(self)' },
          { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.groq.com https://generativelanguage.googleapis.com https://api.resend.com https://api.flutterwave.com https://api.monetbil.com https://unpkg.com",
              "media-src 'self' blob: https:",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      config.performance = { hints: false };
      config.parallelism = 1;
    }
    config.resolve.alias['@'] = path.join(__dirname, 'src');
    return config;
  },
}

export default nextConfig
