/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'export',  // <-- IMPORTANT pour export statique  trailingSlash: true,  // <-- Évite les erreurs 403 lors du rafraîchissement  productionBrowserSourceMaps: false,
  turbopack: {}, // Silences Turbopack warning
}

export default nextConfig
