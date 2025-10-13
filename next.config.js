/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Empêche la détection d’anciens fichiers Pages Router (.js/.ts/.jsx/.tsx)
  // en dehors des conventions App Router. On force la résolution sur nos
  // extensions App Router uniquement.
  pageExtensions: ['page.tsx', 'layout.tsx', 'route.ts', 'middleware.ts'],

  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
