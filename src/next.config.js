/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tối ưu cho development
  reactStrictMode: true,
  
  // Optimize production build
  swcMinify: true,
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Experimental features - đơn giản hóa
  experimental: {
    serverComponentsExternalPackages: ['pg'],
  },

  // Webpack config để ignore Node.js modules khi build client-side
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignore Node.js modules cho client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        'pg-native': false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
