/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript during production builds
    ignoreBuildErrors: true,
  },
  // Enable static optimization
  swcMinify: true,
  images: {
    domains: ['app.hubspot.com'],
  },
}

module.exports = nextConfig 