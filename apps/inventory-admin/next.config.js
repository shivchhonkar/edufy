/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@edulakhya/types', '@edulakhya/utils', '@edulakhya/ui', '@edulakhya/database', '@edulakhya/auth'],
};

module.exports = nextConfig;

