import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['@universe/ui', '@universe/core'],
  async rewrites() {
    return [
      {
        source: '/storybook',
        destination: '/storybook/index.html',
      },
      {
        source: '/storybook/',
        destination: '/storybook/index.html',
      },
    ];
  },
};

export default nextConfig;
