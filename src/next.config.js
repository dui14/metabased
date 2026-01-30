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
    unoptimized: false,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
