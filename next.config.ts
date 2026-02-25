import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Configure server external packages for both webpack and Turbopack
  serverExternalPackages: ['handlebars'],
  // Keep webpack config for backwards compatibility when not using Turbopack
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals as string[]), "handlebars"];
    }
    return config;
  },
};

export default nextConfig;
