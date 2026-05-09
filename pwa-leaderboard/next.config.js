/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  headers: async () => [
    {
      source: '/manifest.json',
      headers: [
        { key: 'Content-Type', value: 'application/manifest+json' },
      ],
    },
  ],
  // PWA support via service worker
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
};

module.exports = nextConfig;
