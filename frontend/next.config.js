const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@rainbow-me/rainbowkit', '@wagmi/core'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Work around a build-time prerender crash ("Cannot mix BigInt and other types")
  // that only reproduces in the default build mode and disappears under
  // `next build --debug-prerender` (which disables server minification).
  experimental: {
    serverMinification: false,
    serverSourceMaps: true,
  },
  outputFileTracingRoot: path.join(__dirname, '..'),
  allowedDevOrigins: ['127.0.0.1', 'localhost', '127.1.1.1'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
    };

    return config;
  },
};

module.exports = nextConfig;
