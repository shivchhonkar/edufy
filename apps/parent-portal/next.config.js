/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@EduLakhya/types', '@EduLakhya/utils', '@EduLakhya/ui', '@EduLakhya/database', '@EduLakhya/auth'],
};

module.exports = nextConfig;

