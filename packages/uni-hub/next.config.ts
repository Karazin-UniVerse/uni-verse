import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['@universe/ui'],
  async redirects() {
    return [
      {
        source: '/storybook',
        destination: '/storybook/',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/storybook/',
        destination: '/storybook/index.html',
      },
    ];
  },
};

export default nextConfig;
