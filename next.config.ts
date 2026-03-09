import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {},
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Optimize production builds
  swcMinify: true,
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
    // Enable modern formats
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Configure server external packages for both webpack and Turbopack
  serverExternalPackages: ['handlebars'],
  // Keep webpack config for backwards compatibility when not using Turbopack
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals as string[]), 'handlebars'];
    }
    // Bundle analyzer for performance tracking (only in development)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(new BundleAnalyzerPlugin());
    }
    // Code splitting optimizations
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Separate vendor chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          // Separate Three.js and heavy 3D libraries
          three: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: 'three',
            chunks: 'all',
            priority: 10,
          },
          // Separate PDF libraries
          pdf: {
            test: /[\\/]node_modules[\\/](jspdf|html2canvas)[\\/]/,
            name: 'pdf',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    };
    return config;
  },
  // Experimental features for better performance
  experimental: {
    // Optimize package loading
    optimizePackageImports: ['lucide-react', '@radix-ui/react'],
  },
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
