import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['next-auth', '@auth/core'],
};

export default nextConfig;
