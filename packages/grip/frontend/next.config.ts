import type { NextConfig } from 'next';

const config: NextConfig = {
  basePath: '/dev-tools/grip',
  transpilePackages: ['@universe/ui', '@universe/core'],
};

export default config;
