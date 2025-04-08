/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
    esmExternals: true,
    serverComponentsExternalPackages: [],
    // Disable static optimization for all API routes to prevent DYNAMIC_SERVER_USAGE errors
    disableOptimizedLoading: true
  },
  // Configure for dynamic routes and avoid static generation issues
  output: 'standalone',
  staticPageGenerationTimeout: 300,
  // Set default export condition for serverless functions
  serverRuntimeConfig: {
    unstable_allowDynamic: [
      '**/node_modules/lodash/**/*.js',
      '**/node_modules/uuid/**/*.js',
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async headers() {
    const allowedOrigins = process.env.NODE_ENV === 'development' 
      ? ['http://localhost:3000', 'https://app.messagelm.com']
      : ['https://app.messagelm.com'];

    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigins.join(',') },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Auth' },
        ],
      },
    ];
  },
  transpilePackages: ['next-auth'],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
      'uuid/dist/esm-node/': 'uuid/dist/',
      'uuid/dist/esm-node': 'uuid/dist',
      'uuid/dist/esm-browser/': 'uuid/dist/',
      'uuid/dist/esm-browser': 'uuid/dist'
    };
    return config;
  },
}

module.exports = nextConfig
