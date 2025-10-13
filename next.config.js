/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['pagex'], // ignore pages/*.tsx
  experimental: { appDir: true }
};
export default nextConfig;
